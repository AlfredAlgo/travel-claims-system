require('dotenv').config();
const express  = require('express');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const nodemailer = require('nodemailer');
const path     = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gpg-travel-dev-secret-change-in-prod';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

async function detectDbCapabilities() {
  const checks = await Promise.all([
    supabase.from('users').select('email').limit(0),
    supabase.from('claim_status_history').select('info_message').limit(0),
    supabase.from('claims').select('doc_links').limit(0),
    supabase.from('claims').select('vehicle_category').limit(0),
    supabase.from('claims').select('tariff_rate').limit(0),
    supabase.from('claim_attachments').select('id').limit(0),
    supabase.from('tariff_schedules').select('id').limit(0),
    supabase.from('delegations').select('id').limit(0),
    supabase.from('sla_targets').select('status').limit(0),
    supabase.from('claims').select('feedback_recipient_role').limit(0),
  ]);
  const keys = ['userEmail','infoMessage','docLinks','vehicleCategory','tariffRate','attachments','tariffSchedules','delegations','slaTargets','feedbackMeta'];
  checks.forEach((r, i) => { DB_CAPS[keys[i]] = !r.error; });
  console.log('DB capabilities:', DB_CAPS);
}

// Returns the delegated roles for a user (roles they are acting on behalf of today)
async function getActiveDelegatedRoles(userId) {
  if (!DB_CAPS.delegations) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('delegations')
    .select('role')
    .eq('delegate_id', userId)
    .eq('active', true)
    .lte('start_date', today)
    .gte('end_date', today);
  return (data || []).map(d => d.role);
}

async function getEmailsByRole(...roles) {
  if (!DB_CAPS.userEmail) return [];
  const { data } = await supabase.from('users').select('email').in('role', roles);
  return (data || []).map(u => u.email).filter(Boolean);
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

  const { data: user, error } = await supabase
    .from('users').select('*').eq('username', username).eq('password', password).single();

  if (error || !user) return res.status(401).json({ error: 'Invalid username or password' });

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
  const attachSel = DB_CAPS.attachments ? ', claim_attachments(id,field_key,file_name,mime_type,file_size,created_at)' : '';
  let query = supabase
    .from('claims')
    .select(`*, trips(*)${attachSel}`)
    .order('created_at', { ascending: false });

  if (role === 'official') query = query.eq('persal', persal);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(normalizeClaim));
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
      const { data: dup } = await supabase
        .from('claims')
        .select('id, ref')
        .eq('persal', body.persal)
        .neq('status', 'rejected')
        .neq('status', 'draft')
        .limit(200);

      if (dup && dup.length > 0) {
        const dupIds = dup.map(d => d.id);
        const { data: dupTrips } = await supabase
          .from('trips')
          .select('claim_id, date_from, origin, dest')
          .in('claim_id', dupIds)
          .eq('date_from', dateVal)
          .ilike('origin', originVal)
          .ilike('dest', destVal);

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

  const { data: claim, error: claimErr } = await supabase
    .from('claims')
    .insert({
      ref,
      user_id:       user.id,
      name:          body.name,
      persal:        body.persal,
      dept:          body.dept         || '',
      contact:       body.contact      || '',
      phone:         body.phone        || '',
      purpose:       body.purpose,
      logsheet:      body.logsheet     || '',
      date_from:     body.dateFrom     || null,
      date_to:       body.dateTo       || null,
      vehicle_type:  body.vehicleType  || '',
      engine_idx:    body.engineIdx    || '',
      km_bracket:    body.kmBracket    || '',
      // New vehicle fields
      ...(DB_CAPS.vehicleCategory && {
        vehicle_category:     body.vehicleCategory     || 'A',
        fuel_type:            body.fuelType            || 'petrol',
        engine_band:          body.engineBand          || '',
        weight_band:          body.weightBand          || '',
        reimbursement_scheme: body.reimbursementScheme || 'private',
      }),
      ...(DB_CAPS.tariffRate && {
        tariff_rate: parseFloat(body.tariffRate) || 0,
        persal_ref:  body.persalRef || '',
        is_late_submission:    isLate,
        late_submission_reason: body.lateSubmissionReason || '',
        duplicate_exception:   !!body.duplicateException,
        duplicate_exception_note: body.duplicateExceptionNote || '',
      }),
      reg:           body.reg          || '',
      km:            body.km           || 0,
      amount:        body.amount       || 0,
      status:        isDraft ? 'draft' : 'pending',
      docs:          body.docs         || [],
      ...(DB_CAPS.docLinks && { doc_links: body.docLinks || [] }),
      advance:       body.advance      || false,
      adv_a:         body.advA         || 0,
      adv_b:         body.advB         || 0,
      adv_c:         body.advC         || 0,
      alloc_amounts: body.allocAmounts || {},
      sig_name:      body.sigName      || '',
      sig_rank:      body.sigRank      || '',
      sig_date:      body.sigDate      || null,
    })
    .select()
    .single();

  if (claimErr) return res.status(500).json({ error: claimErr.message });

  // Insert trips
  if (trips.length > 0) {
    const { error: tripErr } = await supabase.from('trips').insert(
      trips.map((t, i) => ({
        claim_id:   claim.id,
        trip_order: i,
        date_from:  t.dateFrom || t.date || null,
        date_to:    t.dateTo   || t.date || null,
        origin:     t.origin   || '',
        dest:       t.dest     || '',
        km:         t.km       || 0,
      }))
    );
    if (tripErr) return res.status(500).json({ error: tripErr.message });
  }

  // Store file attachments (base64)
  const attachments = body.attachments || [];
  if (DB_CAPS.attachments && attachments.length > 0) {
    const attachRows = attachments
      .filter(a => a.fileData && a.fileName)
      .map(a => ({
        claim_id:    claim.id,
        field_key:   a.fieldKey   || 'general',
        file_name:   a.fileName,
        file_data:   a.fileData,
        mime_type:   a.mimeType   || 'application/octet-stream',
        file_size:   a.fileSize   || 0,
        uploaded_by: user.id,
      }));
    if (attachRows.length > 0) {
      await supabase.from('claim_attachments').insert(attachRows);
    }
  }

  // Re-fetch with trips + attachments
  const attachSel = DB_CAPS.attachments ? ', claim_attachments(id,field_key,file_name,mime_type,file_size,created_at)' : '';
  const { data: claimWithTrips } = await supabase
    .from('claims')
    .select(`*, trips(*)${attachSel}`)
    .eq('id', claim.id)
    .single();

  await supabase.from('claim_status_history').insert({
    claim_id:    claim.id,
    from_status: null,
    to_status:   isDraft ? 'draft' : 'pending',
    changed_by:  user.id,
    note:        isDraft ? 'Draft saved' : 'Claim submitted',
  });

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
  approved:    { roles: ['supervisor'], from: ['pending'] },
  compiled:    { roles: ['compiler'],   from: ['approved'] },
  verified:    { roles: ['verifier'],   from: ['compiled'] },
  hr_approved: { roles: ['approver'],   from: ['verified'] },
  paid:        { roles: ['hrs'],        from: ['hr_approved'] },
  rejected:    { roles: ['supervisor','compiler','verifier','approver','hrs'], from: null },
  info_requested: { roles: ['hrs'],     from: ['hr_approved'] },
  pending:     { roles: ['official'],   from: ['draft'] },
};

// For rejections: validate the actor can reject the current claim status
const REJECTION_FROM = {
  supervisor: ['pending'],
  compiler:   ['approved'],
  verifier:   ['compiled'],
  approver:   ['verified'],
  hrs:        ['hr_approved'],
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

  const userSel = DB_CAPS.userEmail ? 'users(name, email)' : 'users(name)';
  const attachSel = DB_CAPS.attachments ? ', claim_attachments(id,field_key,file_name,mime_type,file_size,created_at)' : '';
  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select(`id, status, name, persal, dept, purpose, amount, user_id, ${userSel}`)
    .eq('ref', ref)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });

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

  const { data: updated, error } = await supabase
    .from('claims')
    .update({ status })
    .eq('ref', ref)
    .select(`*, trips(*)${attachSel}`)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('claim_status_history').insert({
    claim_id:    existing.id,
    from_status: existing.status,
    to_status:   status,
    changed_by:  user.id,
    note:        note || '',
    ...(DB_CAPS.infoMessage && note ? { info_message: note } : {}),
  });

  const officialEmail = existing.users?.email;
  const claimSummaryHtml = buildClaimSummaryHtml(ref, existing.name, existing.dept, existing.purpose, existing.amount);

  // Notifications per status
  if (status === 'approved') {
    const compilerEmails = await getEmailsByRole('compiler');
    sendEmail({
      to: [...(compilerEmails.length ? compilerEmails : []), officialEmail].filter(Boolean),
      subject: `[GPG Claims] Claim approved — ${ref}`,
      html: emailTemplate('Claim approved by supervisor',
        `<p>Claim <strong>${ref}</strong> has been approved and is now with the Compiler queue.</p>${claimSummaryHtml}`),
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
    sendEmail({
      to: hrsEmails,
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
    const priorRoles = {
      supervisor: [],
      compiler:   ['supervisor'],
      verifier:   ['supervisor','compiler'],
      approver:   ['supervisor','compiler','verifier'],
      hrs:        ['supervisor','compiler','verifier','approver'],
    }[user.role] || [];

    const priorEmails = priorRoles.length > 0 ? await getEmailsByRole(...priorRoles) : [];
    sendEmail({
      to: [officialEmail, ...priorEmails].filter(Boolean),
      subject: `[GPG Claims] Claim rejected — ${ref}`,
      html: emailTemplate('Claim has been rejected',
        `<p>Claim <strong>${ref}</strong> was rejected by ${user.name} (${user.role}).</p>${claimSummaryHtml}
         <div style="margin-top:16px;padding:14px;background:#fff0f0;border-left:3px solid #e02d3c;border-radius:4px">
           <p style="margin:0;font-size:13px;font-weight:bold;color:#666">Reason:</p>
           <p style="margin:8px 0 0;font-size:14px">${note || '—'}</p>
         </div>`),
    });
  }

  if (status === 'paid') {
    sendEmail({
      to: officialEmail,
      subject: `[GPG Claims] Your claim has been paid — ${ref}`,
      html: emailTemplate('Your claim has been paid',
        `<p>Your travel claim has been processed and payment has been confirmed on Persal.</p>${claimSummaryHtml}
         <p style="margin-top:16px;color:#0F6E56;font-weight:bold">Payment processed.</p>`),
    });
  }

  res.json(normalizeClaim(updated));
});

// ── Info request (HRS on hr_approved claims) ──────────────────────────────────

app.post('/api/claims/:ref/request-info', requireAuth, async (req, res) => {
  // Each role can request changes from the previous stage actor
  const FEEDBACK_ROUTES = {
    supervisor: { recipientRole: 'official',  returnStatus: 'pending',     requiredStatus: 'pending'     },
    compiler:   { recipientRole: 'official',  returnStatus: 'approved',    requiredStatus: 'approved'    },
    verifier:   { recipientRole: 'compiler',  returnStatus: 'compiled',    requiredStatus: 'compiled'    },
    approver:   { recipientRole: 'verifier',  returnStatus: 'verified',    requiredStatus: 'verified'    },
    hrs:        { recipientRole: 'official',  returnStatus: 'hr_approved', requiredStatus: 'hr_approved' },
  };
  const route = FEEDBACK_ROUTES[req.user.role];
  if (!route) return res.status(403).json({ error: 'Forbidden' });

  const { ref } = req.params;
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const userSel = DB_CAPS.userEmail ? 'users(name, email)' : 'users(name)';
  const attachSel = DB_CAPS.attachments ? ', claim_attachments(id,field_key,file_name,mime_type,file_size,created_at)' : '';
  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select(`id, status, name, purpose, amount, user_id, ${userSel}`)
    .eq('ref', ref)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });
  if (existing.status !== route.requiredStatus) {
    return res.status(400).json({ error: `Claim must be in '${route.requiredStatus}' status` });
  }

  const claimUpdates = {
    status: 'info_requested',
    ...(DB_CAPS.feedbackMeta ? {
      feedback_recipient_role: route.recipientRole,
      feedback_return_status:  route.returnStatus,
    } : {}),
  };

  const { data: updated, error } = await supabase
    .from('claims').update(claimUpdates).eq('ref', ref)
    .select(`*, trips(*)${attachSel}`).single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('claim_status_history').insert({
    claim_id: existing.id, from_status: route.requiredStatus, to_status: 'info_requested',
    changed_by: req.user.id, note: message,
    ...(DB_CAPS.infoMessage ? { info_message: message } : {}),
  });

  // Notify recipient (official = claim owner, otherwise notify all users with that role)
  const ROLE_LABELS = { official: 'Official', compiler: 'Compiler', verifier: 'Verifier', approver: 'HR Approver', hrs: 'HRS' };
  let recipientEmails = [];
  if (route.recipientRole === 'official') {
    if (existing.users?.email) recipientEmails = [existing.users.email];
  } else {
    recipientEmails = await getEmailsByRole(route.recipientRole);
  }
  sendEmail({
    to: recipientEmails,
    subject: `[GPG Claims] Changes requested — ${ref}`,
    html: emailTemplate(`Changes requested on claim ${ref}`,
      `<p>${ROLE_LABELS[req.user.role] || req.user.role} has requested changes to this claim before it can proceed.</p>
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

  const attachSel = DB_CAPS.attachments ? ', claim_attachments(id,field_key,file_name,mime_type,file_size,created_at)' : '';
  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select(`id, status, name, purpose, persal, feedback_recipient_role, feedback_return_status`)
    .eq('ref', ref)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });
  if (existing.status !== 'info_requested') {
    return res.status(400).json({ error: 'Claim is not in info_requested state' });
  }

  // Authorisation: officials are matched by persal; all other recipients by role
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
  const updates = {
    status: returnStatus,
    ...(DB_CAPS.feedbackMeta ? { feedback_recipient_role: null, feedback_return_status: null } : {}),
  };

  const { data: updated, error } = await supabase
    .from('claims').update(updates).eq('ref', ref)
    .select(`*, trips(*)${attachSel}`).single();

  if (error) return res.status(500).json({ error: error.message });

  // Store any new attachments
  if (DB_CAPS.attachments && (newAttachments || []).length > 0) {
    const rows = newAttachments.filter(a => a.fileData && a.fileName).map(a => ({
      claim_id: existing.id, field_key: a.fieldKey || 'feedback-response',
      file_name: a.fileName, file_data: a.fileData,
      mime_type: a.mimeType || 'application/octet-stream',
      file_size: a.fileSize || 0, uploaded_by: req.user.id,
    }));
    if (rows.length > 0) await supabase.from('claim_attachments').insert(rows);
  }

  await supabase.from('claim_status_history').insert({
    claim_id: existing.id, from_status: 'info_requested', to_status: returnStatus,
    changed_by: req.user.id, note: message || 'Response provided',
    ...(DB_CAPS.infoMessage ? { info_message: message || '' } : {}),
  });

  // Notify the stage that is now responsible for this claim
  const STAGE_ROLES = {
    pending:     ['supervisor'],
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
  const { data: attach, error } = await supabase
    .from('claim_attachments').select('*').eq('id', attachmentId).single();

  if (error || !attach) return res.status(404).json({ error: 'Attachment not found' });

  const buffer = Buffer.from(attach.file_data, 'base64');
  res.set('Content-Type', attach.mime_type);
  res.set('Content-Disposition', `attachment; filename="${attach.file_name}"`);
  res.send(buffer);
});

// ── Tariff schedule endpoints (admin) ─────────────────────────────────────────

app.get('/api/tariff-schedules', requireAuth, async (req, res) => {
  if (!DB_CAPS.tariffSchedules) return res.json([]);

  const { data, error } = await supabase
    .from('tariff_schedules')
    .select('*, tariff_rates(*)')
    .order('effective_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/tariff-schedules', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (!DB_CAPS.tariffSchedules) return res.status(503).json({ error: 'Tariff schedules not available' });

  const { circularRef, effectiveDate, notes, rates } = req.body;
  if (!circularRef || !effectiveDate) return res.status(400).json({ error: 'circularRef and effectiveDate required' });

  const { data: schedule, error: sErr } = await supabase
    .from('tariff_schedules')
    .insert({ circular_ref: circularRef, effective_date: effectiveDate, notes: notes || '', created_by: req.user.id })
    .select().single();

  if (sErr) return res.status(500).json({ error: sErr.message });

  if (rates && rates.length > 0) {
    await supabase.from('tariff_rates').insert(
      rates.map(r => ({
        schedule_id: schedule.id,
        category:    r.category,
        fuel_type:   r.fuelType   || 'petrol',
        band:        r.band,
        scheme:      r.scheme     || 'private',
        rate_rand:   parseFloat(r.rateRand) || 0,
        persal_ref:  r.persalRef  || '',
      }))
    );
  }

  const { data: full } = await supabase
    .from('tariff_schedules').select('*, tariff_rates(*)').eq('id', schedule.id).single();

  res.status(201).json(full);
});

app.delete('/api/tariff-schedules/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { error } = await supabase.from('tariff_schedules').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Claim history ─────────────────────────────────────────────────────────────

app.get('/api/claims/:ref/history', requireAuth, async (req, res) => {
  const { data: claim } = await supabase.from('claims').select('id').eq('ref', req.params.ref).single();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const sel = `id, from_status, to_status, note${DB_CAPS.infoMessage ? ', info_message' : ''}, created_at, users(name, role)`;
  const { data, error } = await supabase
    .from('claim_status_history')
    .select(sel)
    .eq('claim_id', claim.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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
  const { data, error } = await supabase.from('sla_targets').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/sla-targets/:status', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  if (!DB_CAPS.slaTargets) return res.status(503).json({ error: 'SLA targets not available' });
  const { working_days } = req.body;
  if (!working_days || working_days < 1) return res.status(400).json({ error: 'working_days must be >= 1' });
  const { data, error } = await supabase
    .from('sla_targets')
    .update({ working_days })
    .eq('status', req.params.status)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Delegations ───────────────────────────────────────────────────────────────

app.get('/api/delegations', requireAuth, async (req, res) => {
  if (!DB_CAPS.delegations) return res.json([]);
  const { id } = req.user;
  const { data, error } = await supabase
    .from('delegations')
    .select(`
      id, role, start_date, end_date, reason, active, created_at,
      delegator:delegator_id(id, name, persal, role),
      delegate:delegate_id(id, name, persal, role)
    `)
    .or(`delegator_id.eq.${id},delegate_id.eq.${id}`)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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

  const { data, error } = await supabase
    .from('delegations')
    .insert({
      delegator_id: user.id,
      delegate_id:  delegateId,
      role,
      start_date:   startDate,
      end_date:     endDate,
      reason:       reason || '',
      active:       true,
    })
    .select(`
      id, role, start_date, end_date, reason, active, created_at,
      delegator:delegator_id(id, name, persal, role),
      delegate:delegate_id(id, name, persal, role)
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Notify the delegate
  if (DB_CAPS.userEmail) {
    const { data: delegateUser } = await supabase.from('users').select('email').eq('id', delegateId).single();
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

  res.status(201).json(data);
});

app.delete('/api/delegations/:id', requireAuth, async (req, res) => {
  if (!DB_CAPS.delegations) return res.status(503).json({ error: 'Delegations not available' });
  // Deactivate (not hard delete) — only the delegator can revoke
  const { data: existing } = await supabase
    .from('delegations').select('delegator_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Delegation not found' });
  if (existing.delegator_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the delegator can revoke a delegation' });
  }
  const { error } = await supabase
    .from('delegations').update({ active: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.get('/api/users', requireAuth, async (req, res) => {
  // Returns users that can receive a delegation (same or adjacent roles, excluding self)
  const { data, error } = await supabase
    .from('users')
    .select('id, name, persal, role, dept')
    .neq('id', req.user.id)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── Audit log (admin only) ────────────────────────────────────────────────────

app.get('/api/audit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const sel = `id, from_status, to_status, note${DB_CAPS.infoMessage ? ', info_message' : ''}, created_at, users(name, role), claims(ref, name, persal, dept)`;
  const { data, error } = await supabase
    .from('claim_status_history').select(sel)
    .order('created_at', { ascending: false }).limit(500);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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
  const { count } = await supabase
    .from('users').select('*', { count: 'exact', head: true });

  if (count && count > 0) return;

  const DEMO = [
    { username: 'dlamini', password: 'pass123',  name: 'T. Dlamini', persal: '20482345', dept: 'GPG — Health',       role: 'official'  },
    { username: 'khumalo', password: 'pass123',  name: 'N. Khumalo', persal: '20481111', dept: 'GPG — Finance',      role: 'supervisor' },
    { username: 'mokoena', password: 'pass123',  name: 'P. Mokoena', persal: '20481222', dept: 'GPG — Internal HR',  role: 'compiler'  },
    { username: 'nkosi',   password: 'pass123',  name: 'L. Nkosi',   persal: '20481333', dept: 'GPG — Internal HR',  role: 'verifier'  },
    { username: 'dube',    password: 'pass123',  name: 'S. Dube',    persal: '20481444', dept: 'GPG — Internal HR',  role: 'approver'  },
    { username: 'sithole', password: 'pass123',  name: 'B. Sithole', persal: '20489876', dept: 'GPG — Internal HR',  role: 'hrs'       },
    { username: 'admin',   password: 'admin123', name: 'Admin User', persal: '',         dept: 'GPG — System Admin', role: 'admin'     },
  ];

  const { error } = await supabase.from('users').insert(DEMO);
  if (error) {
    console.error('Failed to seed users:', error.message);
    return;
  }
  console.log('Demo users seeded.');
  if (DB_CAPS.userEmail) {
    const emails = [
      { username: 'dlamini', email: 'official@gpg-demo.gov.za'   },
      { username: 'khumalo', email: 'supervisor@gpg-demo.gov.za'  },
      { username: 'mokoena', email: 'compiler@gpg-demo.gov.za'    },
      { username: 'nkosi',   email: 'verifier@gpg-demo.gov.za'    },
      { username: 'dube',    email: 'approver@gpg-demo.gov.za'    },
      { username: 'sithole', email: 'internalhr@gpg-demo.gov.za'  },
      { username: 'admin',   email: 'admin@gpg-demo.gov.za'       },
    ];
    for (const { username, email } of emails) {
      await supabase.from('users').update({ email }).eq('username', username);
    }
  }
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`GPG Travel Claims API → http://localhost:${PORT}`);
  await detectDbCapabilities();
  await ensureUsersSeeded();
});
