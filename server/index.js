require('dotenv').config();
const express    = require('express');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const path       = require('path');
const { Pool }   = require('pg');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gpg-travel-dev-secret-change-in-prod';

// DATABASE_URL works for both Azure PostgreSQL and Supabase direct PostgreSQL.
// Azure:    postgresql://user@host:pass@host.postgres.database.azure.com:5432/db?sslmode=require
// Supabase: postgresql://postgres:pass@db.[ref].supabase.co:5432/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Lightweight query helper
const db = { query: (text, params) => pool.query(text, params) };

// ── DB helper: fetch a claim with its trips and attachments ──────────────────
async function getClaimFull(where, param) {
  const { rows: [claim] } = await db.query(`SELECT * FROM claims WHERE ${where} = $1`, [param]);
  if (!claim) return null;
  const [tripsRes, attRes] = await Promise.all([
    db.query('SELECT * FROM trips WHERE claim_id = $1 ORDER BY trip_order ASC', [claim.id]),
    DB_CAPS.attachments
      ? db.query('SELECT id,field_key,file_name,mime_type,file_size,created_at FROM claim_attachments WHERE claim_id = $1', [claim.id])
      : Promise.resolve({ rows: [] }),
  ]);
  claim.trips = tripsRes.rows;
  claim.claim_attachments = attRes.rows;
  return claim;
}

const isProd = process.env.NODE_ENV === 'production';
app.use(cors(isProd ? {} : { origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '25mb' })); // allow base64-encoded file attachments

// ── Email service ────────────────────────────────────────────────────────────

const transporter = process.env.EMAIL_USER
  ? nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
  : null;

async function sendEmail({ to, subject, html }) {
  if (!transporter || !to) return;
  const recipients = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;
  if (!recipients) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients, subject, html,
    });
    console.log(`Email → ${recipients} "${subject}"`);
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

// DB capabilities (detected at startup)
const DB_CAPS = {
  userEmail:       false,
  infoMessage:     false,
  docLinks:        false,
  vehicleCategory: false,
  tariffRate:      false,
  attachments:     false,
  tariffSchedules: false,
  delegations:     false,
  slaTargets:      false,
  feedbackMeta:    false,
};

async function colExists(table, column) {
  const { rows } = await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2 LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const { rows } = await db.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name=$1 LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function detectDbCapabilities() {
  const [
    userEmail, infoMessage, docLinks, vehicleCategory, tariffRate,
    attachments, tariffSchedules, delegations, slaTargets, feedbackMeta,
  ] = await Promise.all([
    colExists('users',                'email'),
    colExists('claim_status_history', 'info_message'),
    colExists('claims',               'doc_links'),
    colExists('claims',               'vehicle_category'),
    colExists('claims',               'tariff_rate'),
    tableExists('claim_attachments'),
    tableExists('tariff_schedules'),
    tableExists('delegations'),
    tableExists('sla_targets'),
    colExists('claims',               'feedback_recipient_role'),
  ]);
  Object.assign(DB_CAPS, { userEmail, infoMessage, docLinks, vehicleCategory, tariffRate, attachments, tariffSchedules, delegations, slaTargets, feedbackMeta });
  console.log('DB capabilities:', DB_CAPS);
}

// Returns the delegated roles for a user (roles they are acting on behalf of today)
async function getActiveDelegatedRoles(userId) {
  if (!DB_CAPS.delegations) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await db.query(
    `SELECT role FROM delegations WHERE delegate_id=$1 AND active=true AND start_date<=$2 AND end_date>=$2`,
    [userId, today]
  );
  return rows.map(d => d.role);
}

async function getEmailsByRole(...roles) {
  if (!DB_CAPS.userEmail || roles.length === 0) return [];
  const placeholders = roles.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await db.query(`SELECT email FROM users WHERE role IN (${placeholders})`, roles);
  return rows.map(u => u.email).filter(Boolean);
}

function emailTemplate(title, bodyHtml) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background:#185FA5;padding:20px 24px">
        <p style="margin:0;font-size:11px;color:#aacfef;text-transform:uppercase;letter-spacing:1px">Gauteng Provincial Government</p>
        <h2 style="margin:4px 0 0;color:#fff;font-size:18px">Persal Travel &amp; Subsistence Claims</h2>
      </div>
      <div style="padding:24px">
        <h3 style="margin:0 0 16px;color:#185FA5;font-size:16px">${title}</h3>
        ${bodyHtml}
      </div>
      <div style="background:#f5f7fa;padding:12px 24px;font-size:11px;color:#888;border-top:1px solid #e0e0e0">
        This is an automated notification from the GPG Travel Claims System. Do not reply to this email.
      </div>
    </div>`;
}

// ── Auth middleware ────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Shape helpers ─────────────────────────────────────────────────────────────

function normalizeClaim(row) {
  return {
    ref:          row.ref,
    id:           row.id,
    name:         row.name,
    persal:       row.persal,
    dept:         row.dept,
    contact:      row.contact,
    phone:        row.phone,
    purpose:      row.purpose,
    logsheet:     row.logsheet,
    dateFrom:     row.date_from,
    dateTo:       row.date_to,
    // Legacy vehicle fields (old claims)
    vehicleType:  row.vehicle_type,
    engineIdx:    row.engine_idx,
    kmBracket:    row.km_bracket,
    // New vehicle fields (T118)
    vehicleCategory:      row.vehicle_category     || '',
    fuelType:             row.fuel_type            || 'petrol',
    engineBand:           row.engine_band          || '',
    weightBand:           row.weight_band          || '',
    tariffRate:           parseFloat(row.tariff_rate)  || 0,
    persalRef:            row.persal_ref           || '',
    reimbursementScheme:  row.reimbursement_scheme || 'private',
    isLateSubmission:     row.is_late_submission   || false,
    lateSubmissionReason: row.late_submission_reason || '',
    duplicateException:   row.duplicate_exception  || false,
    duplicateExceptionNote: row.duplicate_exception_note || '',
    reg:          row.reg,
    km:           parseFloat(row.km)     || 0,
    amount:       parseFloat(row.amount) || 0,
    status:       row.status,
    docs:         row.docs         || [],
    docLinks:     row.doc_links    || [],
    advance:      row.advance,
    advA:         parseFloat(row.adv_a) || 0,
    advB:         parseFloat(row.adv_b) || 0,
    advC:         parseFloat(row.adv_c) || 0,
    allocAmounts: row.alloc_amounts || {},
    mandate:      row.mandate      || '',
    sigName:      row.sig_name,
    sigRank:      row.sig_rank,
    sigDate:      row.sig_date,
    trips: (row.trips || [])
      .sort((a, b) => a.trip_order - b.trip_order)
      .map(t => ({
        id:       t.id,
        dateFrom: t.date_from,
        dateTo:   t.date_to,
        origin:   t.origin,
        dest:     t.dest,
        km:       parseFloat(t.km) || 0,
      })),
    attachments: (row.claim_attachments || []).map(a => ({
      id:        a.id,
      fieldKey:  a.field_key,
      fileName:  a.file_name,
      mimeType:  a.mime_type,
      fileSize:  a.file_size,
      createdAt: a.created_at,
    })),
    feedbackRecipientRole: row.feedback_recipient_role || null,
    feedbackReturnStatus:  row.feedback_return_status  || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const { rows } = await db.query(
    'SELECT * FROM users WHERE username=$1 AND password=$2 LIMIT 1', [username, password]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const payload = {
    id: user.id, name: user.name, persal: user.persal,
    dept: user.dept, role: user.role, username: user.username, email: user.email || '',
  };
  res.json({ token: jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }), user: payload });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// ── Claims routes ─────────────────────────────────────────────────────────────

app.get('/api/claims', requireAuth, async (req, res) => {
  const { role, persal } = req.user;
  try {
    const params = role === 'official' ? [persal] : [];
    const where  = role === 'official' ? 'WHERE c.persal = $1' : '';
    const { rows: claims } = await db.query(
      `SELECT * FROM claims c ${where} ORDER BY c.created_at DESC`, params
    );
    const claimIds = claims.map(c => c.id);
    if (claimIds.length === 0) return res.json([]);

    const [tripsRes, attRes] = await Promise.all([
      db.query(`SELECT * FROM trips WHERE claim_id = ANY($1::uuid[]) ORDER BY trip_order ASC`, [claimIds]),
      DB_CAPS.attachments
        ? db.query(`SELECT id,claim_id,field_key,file_name,mime_type,file_size,created_at FROM claim_attachments WHERE claim_id = ANY($1::uuid[])`, [claimIds])
        : Promise.resolve({ rows: [] }),
    ]);

    const tripsByClaimId = {};
    tripsRes.rows.forEach(t => { (tripsByClaimId[t.claim_id] ||= []).push(t); });
    const attsByClaimId = {};
    attRes.rows.forEach(a => { (attsByClaimId[a.claim_id] ||= []).push(a); });

    const full = claims.map(c => ({
      ...c,
      trips:             tripsByClaimId[c.id] || [],
      claim_attachments: attsByClaimId[c.id]  || [],
    }));
    res.json(full.map(normalizeClaim));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/claims', requireAuth, async (req, res) => {
  const { user } = req;
  const body     = req.body;
  const trips    = body.trips || [];
  const isDraft  = body.status === 'draft';

  // Validation
  const missing = [];
  if (!body.name?.trim())    missing.push('name');
  if (!body.persal?.trim())  missing.push('persal');
  if (!body.purpose?.trim()) missing.push('purpose');
  if (!isDraft) {
    if (!body.reg?.trim())   missing.push('reg');
    if (trips.length === 0)  missing.push('trips');
  }
  if (missing.length > 0) return res.status(400).json({ error: 'Missing required fields', fields: missing });

  // Late submission detection: travel date >30 days ago
  const earliestTrip = trips.length > 0 ? trips.reduce((min, t) => {
    const d = t.dateFrom || t.date;
    return (!min || d < min) ? d : min;
  }, null) : null;
  const isLate = earliestTrip
    ? (new Date() - new Date(earliestTrip)) / (1000 * 60 * 60 * 24) > 30
    : false;

  // Duplicate detection (same persal + date + origin + destination)
  if (!isDraft && trips.length > 0) {
    const firstTrip = trips[0];
    const originVal = firstTrip.origin;
    const destVal   = firstTrip.dest;
    const dateVal   = firstTrip.dateFrom || firstTrip.date;

    if (originVal && destVal && dateVal) {
      const { rows: dup } = await db.query(
        `SELECT id, ref FROM claims WHERE persal=$1 AND status NOT IN ('rejected','draft') LIMIT 200`,
        [body.persal]
      );

      if (dup.length > 0) {
        const dupIds = dup.map(d => d.id);
        const { rows: dupTrips } = await db.query(
          `SELECT claim_id, date_from, origin, dest FROM trips
           WHERE claim_id = ANY($1::uuid[]) AND date_from=$2
             AND LOWER(origin) LIKE LOWER($3) AND LOWER(dest) LIKE LOWER($4)`,
          [dupIds, dateVal, originVal, destVal]
        );

        if (dupTrips && dupTrips.length > 0) {
          const dupClaim = dup.find(d => d.id === dupTrips[0].claim_id);
          if (!body.duplicateException) {
            return res.status(409).json({
              error: 'Duplicate claim detected',
              duplicateRef: dupClaim?.ref || '—',
              message: `A claim for ${body.persal} travelling ${originVal} → ${destVal} on ${dateVal} already exists (${dupClaim?.ref || '—'}). If this trip is different, provide an exception justification.`,
            });
          }
          // Exception requires both note and a letter attachment
          if (!body.duplicateExceptionNote?.trim()) {
            return res.status(400).json({ error: 'Duplicate exception requires a written justification' });
          }
          const hasLetter = (body.attachments || []).some(a =>
            a.fieldKey === 'duplicate_letter' && a.fileData
          );
          if (!hasLetter) {
            return res.status(400).json({ error: 'Duplicate exception requires a letter upload (duplicate_letter)' });
          }
        }
      }
    }
  }

  const year = new Date().getFullYear();
  const ref  = `TC-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  let claim, claimErr;
  try {
    const { rows } = await db.query(`
      INSERT INTO claims (
        ref, user_id, name, persal, dept, contact, phone, purpose, logsheet,
        date_from, date_to, vehicle_type, engine_idx, km_bracket,
        vehicle_category, fuel_type, engine_band, weight_band,
        tariff_rate, persal_ref, reimbursement_scheme,
        is_late_submission, late_submission_reason,
        duplicate_exception, duplicate_exception_note,
        reg, km, amount, status, docs, doc_links, advance,
        adv_a, adv_b, adv_c, alloc_amounts, sig_name, sig_rank, sig_date
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,
        $22,$23,
        $24,$25,
        $26,$27,$28,$29,$30,$31,$32,
        $33,$34,$35,$36,$37,$38,$39
      ) RETURNING *`,
      [
        ref, user.id, body.name, body.persal, body.dept||'', body.contact||'', body.phone||'',
        body.purpose, body.logsheet||'',
        body.dateFrom||null, body.dateTo||null,
        body.vehicleType||'', body.engineIdx||'', body.kmBracket||'',
        body.vehicleCategory||'A', body.fuelType||'petrol', body.engineBand||'', body.weightBand||'',
        parseFloat(body.tariffRate)||0, body.persalRef||'', body.reimbursementScheme||'private',
        isLate, body.lateSubmissionReason||'',
        !!body.duplicateException, body.duplicateExceptionNote||'',
        body.reg||'', body.km||0, body.amount||0,
        isDraft ? 'draft' : 'pending',
        JSON.stringify(body.docs||[]), JSON.stringify(body.docLinks||[]), body.advance||false,
        body.advA||0, body.advB||0, body.advC||0,
        JSON.stringify(body.allocAmounts||{}),
        body.sigName||'', body.sigRank||'', body.sigDate||null,
      ]
    );
    claim = rows[0];
  } catch (err) { claimErr = err; }

  if (claimErr) return res.status(500).json({ error: claimErr.message });

  // Insert trips
  if (trips.length > 0) {
    try {
      for (let i = 0; i < trips.length; i++) {
        const t = trips[i];
        await db.query(
          `INSERT INTO trips (claim_id, trip_order, date_from, date_to, origin, dest, km)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [claim.id, i, t.dateFrom||t.date||null, t.dateTo||t.date||null, t.origin||'', t.dest||'', t.km||0]
        );
      }
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // Store file attachments (base64)
  const attachments = body.attachments || [];
  if (DB_CAPS.attachments && attachments.length > 0) {
    for (const a of attachments.filter(a => a.fileData && a.fileName)) {
      await db.query(
        `INSERT INTO claim_attachments (claim_id, field_key, file_name, file_data, mime_type, file_size, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [claim.id, a.fieldKey||'general', a.fileName, a.fileData, a.mimeType||'application/octet-stream', a.fileSize||0, user.id]
      );
    }
  }

  // Re-fetch with trips + attachments
  const claimWithTrips = await getClaimFull('id', claim.id);

  await db.query(
    `INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [claim.id, null, isDraft ? 'draft' : 'pending', user.id, isDraft ? 'Draft saved' : 'Claim submitted']
  );

  if (!isDraft) {
    const claimSummary = buildClaimSummaryHtml(ref, body.name, body.dept, body.purpose, body.amount);
    const supEmails = await getEmailsByRole('supervisor');
    sendEmail({
      to: supEmails,
      subject: `[GPG Claims] New claim submitted — ${ref}`,
      html: emailTemplate('New claim requires approval',
        `<p>A new travel claim has been submitted and is waiting for your approval.</p>${claimSummary}<p style="margin-top:20px">Please log in to review and approve or reject this claim.</p>`
      ),
    });
  }

  res.status(201).json(normalizeClaim(claimWithTrips || { ...claim, trips: [], claim_attachments: [] }));
});

// ── Status transition ─────────────────────────────────────────────────────────

// Transition rules: which roles can set each status, and from which current status
const TRANSITION_RULES = {
  hrm_pending: { roles: ['supervisor'],       from: ['pending']     },
  approved:    { roles: ['hrm_supervisor'],   from: ['hrm_pending'] },
  compiled:    { roles: ['compiler'],         from: ['approved']    },
  verified:    { roles: ['verifier'],         from: ['compiled']    },
  hr_approved: { roles: ['approver'],         from: ['verified']    },
  paid:        { roles: ['hrs'],              from: ['hr_approved'] },
  rejected:    { roles: ['supervisor','hrm_supervisor','compiler','verifier','approver','hrs'], from: null },
  info_requested: { roles: ['supervisor','hrm_supervisor','compiler','verifier','approver','hrs'], from: null },
  pending:     { roles: ['official'],         from: ['draft']       },
};

// For rejections: validate the actor can reject the current claim status
const REJECTION_FROM = {
  supervisor:     ['pending'],
  hrm_supervisor: ['hrm_pending'],
  compiler:       ['approved'],
  verifier:       ['compiled'],
  approver:       ['verified'],
  hrs:            ['hr_approved'],
};

app.patch('/api/claims/:ref/status', requireAuth, async (req, res) => {
  const { ref } = req.params;
  const { status, note } = req.body;
  const { user } = req;

  const rule = TRANSITION_RULES[status];
  if (!rule) return res.status(400).json({ error: 'Unknown status' });

  let effectiveRole = user.role;
  if (!rule.roles.includes(user.role)) {
    // Check if user has an active delegation covering a required role
    const delegatedRoles = await getActiveDelegatedRoles(user.id);
    const matchedRole = rule.roles.find(r => delegatedRoles.includes(r));
    if (!matchedRole) {
      return res.status(403).json({ error: 'Forbidden: your role cannot set this status' });
    }
    effectiveRole = matchedRole;
  }

  const userEmailJoin = DB_CAPS.userEmail
    ? 'LEFT JOIN users u ON u.id = c.user_id'
    : '';
  const userEmailSel = DB_CAPS.userEmail ? ', u.name AS owner_name, u.email AS owner_email' : '';
  const { rows: [existing] } = await db.query(
    `SELECT c.id, c.status, c.name, c.persal, c.dept, c.purpose, c.amount, c.user_id ${userEmailSel}
     FROM claims c ${userEmailJoin} WHERE c.ref=$1`,
    [ref]
  );
  if (!existing) return res.status(404).json({ error: 'Claim not found' });

  // Validate from-status
  if (status === 'rejected') {
    let allowed = REJECTION_FROM[effectiveRole] || [];
    if (!allowed.includes(existing.status)) {
      // Also check any additional delegated roles
      const delegatedRoles = await getActiveDelegatedRoles(user.id);
      for (const dr of delegatedRoles) {
        allowed = [...allowed, ...(REJECTION_FROM[dr] || [])];
      }
    }
    if (!allowed.includes(existing.status)) {
      return res.status(403).json({ error: `Your role cannot reject a claim in '${existing.status}' status` });
    }
    if (!note?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
  } else if (rule.from && !rule.from.includes(existing.status)) {
    return res.status(400).json({
      error: `Cannot move from '${existing.status}' to '${status}'`,
    });
  }

  await db.query('UPDATE claims SET status=$1 WHERE ref=$2', [status, ref]);
  const updated = await getClaimFull('ref', ref);
  if (!updated) return res.status(500).json({ error: 'Claim update failed' });

  await db.query(
    `INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, note, info_message)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [existing.id, existing.status, status, user.id, note||'', DB_CAPS.infoMessage && note ? note : null]
  );

  const officialEmail = existing.owner_email;
  const claimSummaryHtml = buildClaimSummaryHtml(ref, existing.name, existing.dept, existing.purpose, existing.amount);

  // Notifications per status
  if (status === 'hrm_pending') {
    const hrmEmails = await getEmailsByRole('hrm_supervisor');
    sendEmail({
      to: hrmEmails,
      subject: `[GPG Claims] Claim awaiting allocation — ${ref}`,
      html: emailTemplate('Claim ready for allocation',
        `<p>Claim <strong>${ref}</strong> has been approved by the line manager and is awaiting allocation to the HR compiler.</p>${claimSummaryHtml}`),
    });
  }

  if (status === 'approved') {
    const compilerEmails = await getEmailsByRole('compiler');
    sendEmail({
      to: compilerEmails,
      subject: `[GPG Claims] Claim allocated — ${ref}`,
      html: emailTemplate('Claim allocated to HR Compiler',
        `<p>Claim <strong>${ref}</strong> has been allocated and is now in the HR Compiler queue.</p>${claimSummaryHtml}`),
    });
  }

  if (status === 'compiled') {
    const verifierEmails = await getEmailsByRole('verifier');
    sendEmail({
      to: verifierEmails,
      subject: `[GPG Claims] Claim compiled — ${ref}`,
      html: emailTemplate('Claim ready for verification',
        `<p>Claim <strong>${ref}</strong> has been compiled and is ready for verification.</p>${claimSummaryHtml}`),
    });
  }

  if (status === 'verified') {
    const approverEmails = await getEmailsByRole('approver');
    sendEmail({
      to: approverEmails,
      subject: `[GPG Claims] Claim verified — ${ref}`,
      html: emailTemplate('Claim ready for HR approval',
        `<p>Claim <strong>${ref}</strong> has been verified and is ready for HR approval.</p>${claimSummaryHtml}`),
    });
  }

  if (status === 'hr_approved') {
    const hrsEmails = await getEmailsByRole('hrs');
    // Notify HRS for payment + notify compiler & verifier for visibility
    const compilerVerifierEmails = await getEmailsByRole('compiler', 'verifier');
    sendEmail({
      to: [...hrsEmails, ...compilerVerifierEmails].filter(Boolean),
      subject: `[GPG Claims] Claim HR-approved — ${ref}`,
      html: emailTemplate('Claim ready for payment processing',
        `<p>Claim <strong>${ref}</strong> has been HR-approved and is ready for payment processing on Persal.</p>${claimSummaryHtml}`),
    });
    sendEmail({
      to: officialEmail,
      subject: `[GPG Claims] Your claim has been approved — ${ref}`,
      html: emailTemplate('Your claim has been fully approved',
        `<p>Your travel claim has been approved and is with HRS for payment processing.</p>${claimSummaryHtml}`),
    });
  }

  if (status === 'rejected') {
    // HRS rejection → compiler + approver only, NOT official
    // All other rejections → official + relevant supervisors
    const REJECTION_NOTIFY = {
      supervisor:     { notifyOfficial: true,  extraRoles: [] },
      hrm_supervisor: { notifyOfficial: true,  extraRoles: ['supervisor'] },
      compiler:       { notifyOfficial: true,  extraRoles: ['supervisor'] },
      verifier:       { notifyOfficial: true,  extraRoles: ['supervisor', 'compiler'] },
      approver:       { notifyOfficial: true,  extraRoles: ['supervisor', 'compiler', 'verifier'] },
      hrs:            { notifyOfficial: false, extraRoles: ['compiler', 'approver'] },
    };
    const notify = REJECTION_NOTIFY[effectiveRole] || { notifyOfficial: true, extraRoles: [] };
    const extraEmails = notify.extraRoles.length > 0 ? await getEmailsByRole(...notify.extraRoles) : [];
    const toList = [...(notify.notifyOfficial && officialEmail ? [officialEmail] : []), ...extraEmails].filter(Boolean);
    sendEmail({
      to: toList,
      subject: `[GPG Claims] Claim rejected — ${ref}`,
      html: emailTemplate('Claim has been rejected',
        `<p>Claim <strong>${ref}</strong> was rejected by ${user.name} (${effectiveRole}).</p>${claimSummaryHtml}
         <div style="margin-top:16px;padding:14px;background:#fff0f0;border-left:3px solid #e02d3c;border-radius:4px">
           <p style="margin:0;font-size:13px;font-weight:bold;color:#666">Reason:</p>
           <p style="margin:8px 0 0;font-size:14px">${note || '—'}</p>
         </div>`),
    });
  }

  if (status === 'paid') {
    const compilerApproverEmails = await getEmailsByRole('compiler', 'approver');
    sendEmail({
      to: [officialEmail, ...compilerApproverEmails].filter(Boolean),
      subject: `[GPG Claims] Claim paid — ${ref}`,
      html: emailTemplate('Claim has been paid',
        `<p>Travel claim <strong>${ref}</strong> has been processed and payment has been confirmed on Persal.</p>${claimSummaryHtml}
         <p style="margin-top:16px;color:#0F6E56;font-weight:bold">Payment processed.</p>`),
    });
  }

  res.json(normalizeClaim(updated));
});

// ── Info request — any HR-chain role, with selectable target ─────────────────

app.post('/api/claims/:ref/request-info', requireAuth, async (req, res) => {
  // queueStatus = the status that puts this claim back in the REQUESTER's queue after the target responds
  const REQUEST_INFO_CONFIG = {
    supervisor:     { allowedTargets: ['official'],                                                     queueStatus: 'pending'     },
    hrm_supervisor: { allowedTargets: ['official', 'supervisor'],                                       queueStatus: 'hrm_pending' },
    compiler:       { allowedTargets: ['official', 'supervisor', 'hrm_supervisor'],                     queueStatus: 'approved'    },
    verifier:       { allowedTargets: ['official', 'supervisor', 'hrm_supervisor', 'compiler'],         queueStatus: 'compiled'    },
    approver:       { allowedTargets: ['official', 'supervisor', 'hrm_supervisor', 'compiler', 'verifier'], queueStatus: 'verified' },
    hrs:            { allowedTargets: ['compiler', 'approver'],                                         queueStatus: 'hr_approved' },
  };

  const config = REQUEST_INFO_CONFIG[req.user.role];
  if (!config) return res.status(403).json({ error: 'Forbidden' });

  const { ref } = req.params;
  const { message, targetRole } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const recipientRole = targetRole && config.allowedTargets.includes(targetRole)
    ? targetRole
    : config.allowedTargets[0];

  if (!config.allowedTargets.includes(recipientRole)) {
    return res.status(400).json({ error: `Invalid target role for your position` });
  }

  const emailJoin = DB_CAPS.userEmail ? 'LEFT JOIN users u ON u.id = c.user_id' : '';
  const emailSel  = DB_CAPS.userEmail ? ', u.email AS owner_email' : '';
  const { rows: [existing] } = await db.query(
    `SELECT c.id, c.status, c.name, c.purpose, c.amount, c.user_id, c.persal ${emailSel}
     FROM claims c ${emailJoin} WHERE c.ref=$1`,
    [ref]
  );

  if (!existing) return res.status(404).json({ error: 'Claim not found' });
  if (existing.status !== config.queueStatus) {
    return res.status(400).json({ error: `Claim must be in '${config.queueStatus}' status` });
  }

  if (DB_CAPS.feedbackMeta) {
    await db.query(
      `UPDATE claims SET status='info_requested', feedback_recipient_role=$1, feedback_return_status=$2 WHERE ref=$3`,
      [recipientRole, config.queueStatus, ref]
    );
  } else {
    await db.query(`UPDATE claims SET status='info_requested' WHERE ref=$1`, [ref]);
  }
  const updated = await getClaimFull('ref', ref);

  await db.query(
    `INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, note, info_message)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [existing.id, config.queueStatus, 'info_requested', req.user.id, message, DB_CAPS.infoMessage ? message : null]
  );

  const DISPLAY_LABELS = {
    official: 'Official', supervisor: 'Supervisor', hrm_supervisor: 'HRM Supervisor',
    compiler: 'HR Compiler', verifier: 'HR Verifier', approver: 'HR Approver', hrs: 'HRS',
  };

  let recipientEmails = [];
  if (recipientRole === 'official') {
    if (existing.owner_email) recipientEmails = [existing.owner_email];
  } else {
    recipientEmails = await getEmailsByRole(recipientRole);
  }
  sendEmail({
    to: recipientEmails,
    subject: `[GPG Claims] Changes requested — ${ref}`,
    html: emailTemplate(`Changes requested on claim ${ref}`,
      `<p>${DISPLAY_LABELS[req.user.role] || req.user.role} has requested changes to this claim before it can proceed.</p>
       <p><strong>Ref:</strong> ${ref} · <strong>Purpose:</strong> ${existing.purpose || '—'}</p>
       <div style="margin-top:16px;padding:14px;background:#f3f0ff;border-left:3px solid #534AB7;border-radius:4px">
         <p style="margin:0;font-size:13px;font-weight:bold;color:#666">Changes requested:</p>
         <p style="margin:8px 0 0;font-size:14px">${message}</p>
       </div>
       <p style="margin-top:16px">Please log in to respond from your portal. You may attach replacement documents in your response.</p>`),
  });

  res.json(normalizeClaim(updated));
});

// ── Respond to feedback / info request (any authorised role) ─────────────────

app.post('/api/claims/:ref/respond-info', requireAuth, async (req, res) => {
  const { ref } = req.params;
  const { message, attachments: newAttachments } = req.body;

  const { rows: [existing] } = await db.query(
    `SELECT id, status, name, purpose, persal, feedback_recipient_role, feedback_return_status
     FROM claims WHERE ref=$1`,
    [ref]
  );

  if (!existing) return res.status(404).json({ error: 'Claim not found' });
  if (existing.status !== 'info_requested') {
    return res.status(400).json({ error: 'Claim is not in info_requested state' });
  }

  const recipientRole = existing.feedback_recipient_role || 'official';
  if (recipientRole === 'official') {
    if (existing.persal !== req.user.persal) return res.status(403).json({ error: 'Forbidden' });
  } else {
    const delegated = await getActiveDelegatedRoles(req.user.id);
    if (req.user.role !== recipientRole && !delegated.includes(recipientRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const returnStatus = existing.feedback_return_status || 'hr_approved';
  if (DB_CAPS.feedbackMeta) {
    await db.query(
      `UPDATE claims SET status=$1, feedback_recipient_role=NULL, feedback_return_status=NULL WHERE ref=$2`,
      [returnStatus, ref]
    );
  } else {
    await db.query(`UPDATE claims SET status=$1 WHERE ref=$2`, [returnStatus, ref]);
  }
  const updated = await getClaimFull('ref', ref);

  if (DB_CAPS.attachments && (newAttachments || []).length > 0) {
    for (const a of newAttachments.filter(a => a.fileData && a.fileName)) {
      await db.query(
        `INSERT INTO claim_attachments (claim_id, field_key, file_name, file_data, mime_type, file_size, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [existing.id, a.fieldKey || 'feedback-response', a.fileName, a.fileData,
         a.mimeType || 'application/octet-stream', a.fileSize || 0, req.user.id]
      );
    }
  }

  await db.query(
    `INSERT INTO claim_status_history (claim_id, from_status, to_status, changed_by, note, info_message)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [existing.id, 'info_requested', returnStatus, req.user.id,
     message || 'Response provided', DB_CAPS.infoMessage ? (message || '') : null]
  );

  const STAGE_ROLES = {
    pending:     ['supervisor'],
    hrm_pending: ['hrm_supervisor'],
    approved:    ['compiler'],
    compiled:    ['verifier'],
    verified:    ['approver'],
    hr_approved: ['hrs'],
  };
  const notifyRoles = STAGE_ROLES[returnStatus] || [];
  const notifyEmails = await getEmailsByRole(...notifyRoles);
  sendEmail({
    to: notifyEmails,
    subject: `[GPG Claims] Response provided — ${ref}`,
    html: emailTemplate('Claim changes have been addressed',
      `<p><strong>${existing.name}</strong> has responded to the changes request. The claim is back in your queue.</p>
       ${message ? `<div style="margin-top:16px;padding:14px;background:#f0fdf4;border-left:3px solid #3B6D11;border-radius:4px"><p style="margin:0;font-size:13px;font-weight:bold;color:#666">Response:</p><p style="margin:8px 0 0;font-size:14px">${message}</p></div>` : ''}
       <p style="margin-top:16px">Claim ref: <strong>${ref}</strong></p>`),
  });

  res.json(normalizeClaim(updated));
});

// ── Attachment download ───────────────────────────────────────────────────────

app.get('/api/claims/:ref/attachments/:attachmentId', requireAuth, async (req, res) => {
  if (!DB_CAPS.attachments) return res.status(404).json({ error: 'Attachments not enabled' });

  const { attachmentId } = req.params;
  const { rows: [attach] } = await db.query(
    `SELECT * FROM claim_attachments WHERE id=$1`, [attachmentId]
  );

  if (!attach) return res.status(404).json({ error: 'Attachment not found' });

  const buffer = Buffer.from(attach.file_data, 'base64');
  res.set('Content-Type', attach.mime_type);
  res.set('Content-Disposition', `attachment; filename="${attach.file_name}"`);
  res.send(buffer);
});

// ── Tariff schedule endpoints (admin) ─────────────────────────────────────────

app.get('/api/tariff-schedules', requireAuth, async (req, res) => {
  if (!DB_CAPS.tariffSchedules) return res.json([]);

  try {
    const { rows: schedules } = await db.query(
      `SELECT * FROM tariff_schedules ORDER BY effective_date DESC`
    );
    const scheduleIds = schedules.map(s => s.id);
    const { rows: rates } = scheduleIds.length > 0
      ? await db.query(`SELECT * FROM tariff_rates WHERE schedule_id = ANY($1::uuid[])`, [scheduleIds])
      : { rows: [] };
    const ratesBySchedule = {};
    rates.forEach(r => { (ratesBySchedule[r.schedule_id] ||= []).push(r); });
    res.json(schedules.map(s => ({ ...s, tariff_rates: ratesBySchedule[s.id] || [] })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tariff-schedules', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (!DB_CAPS.tariffSchedules) return res.status(503).json({ error: 'Tariff schedules not available' });

  const { circularRef, effectiveDate, notes, rates } = req.body;
  if (!circularRef || !effectiveDate) return res.status(400).json({ error: 'circularRef and effectiveDate required' });

  try {
    const { rows: [schedule] } = await db.query(
      `INSERT INTO tariff_schedules (circular_ref, effective_date, notes, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [circularRef, effectiveDate, notes || '', req.user.id]
    );

    let insertedRates = [];
    if (rates && rates.length > 0) {
      for (const r of rates) {
        const { rows: [rate] } = await db.query(
          `INSERT INTO tariff_rates (schedule_id, category, fuel_type, band, scheme, rate_rand, persal_ref)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [schedule.id, r.category, r.fuelType || 'petrol', r.band,
           r.scheme || 'private', parseFloat(r.rateRand) || 0, r.persalRef || '']
        );
        insertedRates.push(rate);
      }
    }

    res.status(201).json({ ...schedule, tariff_rates: insertedRates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tariff-schedules/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    await db.query(`DELETE FROM tariff_schedules WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Claim history ─────────────────────────────────────────────────────────────

app.get('/api/claims/:ref/history', requireAuth, async (req, res) => {
  const { rows: [claim] } = await db.query(`SELECT id FROM claims WHERE ref=$1`, [req.params.ref]);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  try {
    const infoCol = DB_CAPS.infoMessage ? ', h.info_message' : '';
    const { rows } = await db.query(
      `SELECT h.id, h.from_status, h.to_status, h.note ${infoCol}, h.created_at,
              u.name AS user_name, u.role AS user_role
       FROM claim_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.claim_id=$1
       ORDER BY h.created_at ASC`,
      [claim.id]
    );
    res.json(rows.map(r => ({
      ...r,
      users: { name: r.user_name, role: r.user_role },
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SLA targets ───────────────────────────────────────────────────────────────

app.get('/api/sla-targets', requireAuth, async (req, res) => {
  if (!DB_CAPS.slaTargets) {
    // Return hardcoded defaults if table not available
    return res.json([
      { status: 'pending',     working_days: 5, label: 'Supervisor approval' },
      { status: 'approved',    working_days: 3, label: 'Compiler processing' },
      { status: 'compiled',    working_days: 2, label: 'Verifier check' },
      { status: 'verified',    working_days: 2, label: 'HR Approver sign-off' },
      { status: 'hr_approved', working_days: 5, label: 'HRS payment processing' },
    ]);
  }
  try {
    const { rows } = await db.query(`SELECT * FROM sla_targets ORDER BY status`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/sla-targets/:status', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (!DB_CAPS.slaTargets) return res.status(503).json({ error: 'SLA targets not available' });
  const { working_days } = req.body;
  if (!working_days || working_days < 1) return res.status(400).json({ error: 'working_days must be >= 1' });
  try {
    const { rows: [updated] } = await db.query(
      `UPDATE sla_targets SET working_days=$1 WHERE status=$2 RETURNING *`,
      [working_days, req.params.status]
    );
    if (!updated) return res.status(404).json({ error: 'SLA target not found' });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Delegations ───────────────────────────────────────────────────────────────

app.get('/api/delegations', requireAuth, async (req, res) => {
  if (!DB_CAPS.delegations) return res.json([]);
  try {
    const { rows } = await db.query(
      `SELECT d.id, d.role, d.start_date, d.end_date, d.reason, d.active, d.created_at,
              tor.id AS delegator_id, tor.name AS delegator_name, tor.persal AS delegator_persal, tor.role AS delegator_role,
              tee.id AS delegate_id,  tee.name AS delegate_name,  tee.persal AS delegate_persal,  tee.role AS delegate_role
       FROM delegations d
       JOIN users tor ON tor.id = d.delegator_id
       JOIN users tee ON tee.id = d.delegate_id
       WHERE d.delegator_id=$1 OR d.delegate_id=$1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      id: r.id, role: r.role, start_date: r.start_date, end_date: r.end_date,
      reason: r.reason, active: r.active, created_at: r.created_at,
      delegator: { id: r.delegator_id, name: r.delegator_name, persal: r.delegator_persal, role: r.delegator_role },
      delegate:  { id: r.delegate_id,  name: r.delegate_name,  persal: r.delegate_persal,  role: r.delegate_role  },
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/delegations', requireAuth, async (req, res) => {
  if (!DB_CAPS.delegations) return res.status(503).json({ error: 'Delegations not available' });
  const { delegateId, role, startDate, endDate, reason } = req.body;
  const { user } = req;

  if (!delegateId || !role || !startDate || !endDate) {
    return res.status(400).json({ error: 'delegateId, role, startDate, endDate are required' });
  }
  // Can only delegate your own role
  if (role !== user.role) {
    return res.status(403).json({ error: 'You can only delegate your own role' });
  }
  if (delegateId === user.id) {
    return res.status(400).json({ error: 'Cannot delegate to yourself' });
  }
  if (endDate < startDate) {
    return res.status(400).json({ error: 'End date must be on or after start date' });
  }

  try {
    const { rows: [del] } = await db.query(
      `INSERT INTO delegations (delegator_id, delegate_id, role, start_date, end_date, reason, active)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
      [user.id, delegateId, role, startDate, endDate, reason || '']
    );

    // Fetch joined view to return same shape as GET
    const { rows: [full] } = await db.query(
      `SELECT d.id, d.role, d.start_date, d.end_date, d.reason, d.active, d.created_at,
              tor.id AS delegator_id, tor.name AS delegator_name, tor.persal AS delegator_persal, tor.role AS delegator_role,
              tee.id AS delegate_id,  tee.name AS delegate_name,  tee.persal AS delegate_persal,  tee.role AS delegate_role
       FROM delegations d
       JOIN users tor ON tor.id = d.delegator_id
       JOIN users tee ON tee.id = d.delegate_id
       WHERE d.id=$1`,
      [del.id]
    );

    if (DB_CAPS.userEmail) {
      const { rows: [delegateUser] } = await db.query(`SELECT email FROM users WHERE id=$1`, [delegateId]);
      if (delegateUser?.email) {
        sendEmail({
          to: delegateUser.email,
          subject: `[GPG Claims] Delegation of authority — ${role}`,
          html: emailTemplate('You have been delegated approval authority',
            `<p><strong>${user.name}</strong> has delegated their <strong>${role}</strong> approval authority to you.</p>
             <table style="width:100%;font-size:14px;border-collapse:collapse">
               <tr><td style="padding:5px 0;color:#666;width:120px">Role delegated</td><td style="padding:5px 0;font-weight:bold">${role}</td></tr>
               <tr><td style="padding:5px 0;color:#666">From</td><td style="padding:5px 0">${startDate}</td></tr>
               <tr><td style="padding:5px 0;color:#666">To</td><td style="padding:5px 0">${endDate}</td></tr>
               ${reason ? `<tr><td style="padding:5px 0;color:#666">Reason</td><td style="padding:5px 0">${reason}</td></tr>` : ''}
             </table>
             <p style="margin-top:16px">Log in to the GPG Travel Claims system to act on claims in this capacity.</p>`),
        });
      }
    }

    res.status(201).json(full ? {
      id: full.id, role: full.role, start_date: full.start_date, end_date: full.end_date,
      reason: full.reason, active: full.active, created_at: full.created_at,
      delegator: { id: full.delegator_id, name: full.delegator_name, persal: full.delegator_persal, role: full.delegator_role },
      delegate:  { id: full.delegate_id,  name: full.delegate_name,  persal: full.delegate_persal,  role: full.delegate_role  },
    } : del);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/delegations/:id', requireAuth, async (req, res) => {
  if (!DB_CAPS.delegations) return res.status(503).json({ error: 'Delegations not available' });
  try {
    const { rows: [existing] } = await db.query(
      `SELECT delegator_id FROM delegations WHERE id=$1`, [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: 'Delegation not found' });
    if (existing.delegator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the delegator can revoke a delegation' });
    }
    await db.query(`UPDATE delegations SET active=false WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, persal, role, dept FROM users WHERE id<>$1 ORDER BY name`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Audit log (admin only) ────────────────────────────────────────────────────

app.get('/api/audit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  try {
    const infoCol = DB_CAPS.infoMessage ? ', h.info_message' : '';
    const { rows } = await db.query(
      `SELECT h.id, h.from_status, h.to_status, h.note ${infoCol}, h.created_at,
              u.name AS user_name, u.role AS user_role,
              c.ref AS claim_ref, c.name AS claim_name, c.persal AS claim_persal, c.dept AS claim_dept
       FROM claim_status_history h
       LEFT JOIN users u  ON u.id  = h.changed_by
       LEFT JOIN claims c ON c.id  = h.claim_id
       ORDER BY h.created_at DESC
       LIMIT 500`
    );
    res.json(rows.map(r => ({
      ...r,
      users:  { name: r.user_name,  role: r.user_role },
      claims: { ref: r.claim_ref, name: r.claim_name, persal: r.claim_persal, dept: r.claim_dept },
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildClaimSummaryHtml(ref, name, dept, purpose, amount) {
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:140px">Claim ref</td><td style="padding:6px 0;font-weight:bold;font-family:monospace">${ref}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Official</td><td style="padding:6px 0">${name}</td></tr>
      ${dept ? `<tr><td style="padding:6px 0;color:#666">Business unit</td><td style="padding:6px 0">${dept}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#666">Purpose</td><td style="padding:6px 0">${purpose || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0;font-weight:bold">R ${(parseFloat(amount) || 0).toFixed(2)}</td></tr>
    </table>`;
}

// ── Serve React build in production ──────────────────────────────────────────

if (isProd) {
  const buildDir = path.join(__dirname, '..', 'build');
  app.use(express.static(buildDir));
  app.get(/(.*)/, (req, res) => res.sendFile(path.join(buildDir, 'index.html')));
}

// ── Startup ───────────────────────────────────────────────────────────────────

async function ensureUsersSeeded() {
  const { rows: [{ count }] } = await db.query(`SELECT COUNT(*) FROM users`);
  if (parseInt(count) > 0) return;

  const DEMO = [
    { username: 'dlamini',  password: 'pass123',  name: 'T. Dlamini',  persal: '20482345', dept: 'GPG — Health',       role: 'official',       email: 'official@gpg-demo.gov.za'      },
    { username: 'khumalo',  password: 'pass123',  name: 'N. Khumalo',  persal: '20481111', dept: 'GPG — Finance',      role: 'supervisor',     email: 'supervisor@gpg-demo.gov.za'    },
    { username: 'pieterse', password: 'pass123',  name: 'R. Pieterse', persal: '20481555', dept: 'GPG — Internal HR',  role: 'hrm_supervisor', email: 'hrmsupervisor@gpg-demo.gov.za' },
    { username: 'mokoena',  password: 'pass123',  name: 'P. Mokoena',  persal: '20481222', dept: 'GPG — Internal HR',  role: 'compiler',       email: 'compiler@gpg-demo.gov.za'      },
    { username: 'nkosi',    password: 'pass123',  name: 'L. Nkosi',    persal: '20481333', dept: 'GPG — Internal HR',  role: 'verifier',       email: 'verifier@gpg-demo.gov.za'      },
    { username: 'dube',     password: 'pass123',  name: 'S. Dube',     persal: '20481444', dept: 'GPG — Internal HR',  role: 'approver',       email: 'approver@gpg-demo.gov.za'      },
    { username: 'sithole',  password: 'pass123',  name: 'B. Sithole',  persal: '20489876', dept: 'GPG — Internal HR',  role: 'hrs',            email: 'internalhr@gpg-demo.gov.za'    },
    { username: 'admin',    password: 'admin123', name: 'Admin User',  persal: '',         dept: 'GPG — System Admin', role: 'admin',          email: 'admin@gpg-demo.gov.za'         },
  ];

  try {
    for (const u of DEMO) {
      await db.query(
        `INSERT INTO users (username, password, name, persal, dept, role, email)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (username) DO NOTHING`,
        [u.username, u.password, u.name, u.persal, u.dept, u.role, DB_CAPS.userEmail ? u.email : null]
      );
    }
    console.log('Demo users seeded.');
  } catch (err) {
    console.error('Failed to seed users:', err.message);
  }
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`GPG Travel Claims API → http://localhost:${PORT}`);
  await detectDbCapabilities();
  await ensureUsersSeeded();
});
