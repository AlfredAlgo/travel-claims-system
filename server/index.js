require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gpg-travel-dev-secret-change-in-prod';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const isProd = process.env.NODE_ENV === 'production';
app.use(cors(isProd ? {} : { origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

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
  if (!transporter || !to || (Array.isArray(to) && to.length === 0)) return;
  const recipients = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;
  if (!recipients) return;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients,
      subject,
      html,
    });
    console.log(`Email sent to ${recipients} — "${subject}"`);
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

// Which optional columns exist in the DB (set at startup by detectDbCapabilities)
const DB_CAPS = { userEmail: false, infoMessage: false, docLinks: false };

async function detectDbCapabilities() {
  const [r1, r2, r3] = await Promise.all([
    supabase.from('users').select('email').limit(0),
    supabase.from('claim_status_history').select('info_message').limit(0),
    supabase.from('claims').select('doc_links').limit(0),
  ]);
  DB_CAPS.userEmail   = !r1.error;
  DB_CAPS.infoMessage = !r2.error;
  DB_CAPS.docLinks    = !r3.error;
  console.log('DB capabilities:', DB_CAPS);
}

async function getEmailsByRole(role) {
  if (!DB_CAPS.userEmail) return [];
  const { data } = await supabase.from('users').select('email').eq('role', role);
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

// ── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Shape helpers ────────────────────────────────────────────────────────────

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
    vehicleType:  row.vehicle_type,
    engineIdx:    row.engine_idx,
    kmBracket:    row.km_bracket,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const payload = {
    id:       user.id,
    name:     user.name,
    persal:   user.persal,
    dept:     user.dept,
    role:     user.role,
    username: user.username,
    email:    user.email || '',
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: payload });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// ── Claims routes ────────────────────────────────────────────────────────────

app.get('/api/claims', requireAuth, async (req, res) => {
  const { role, persal } = req.user;
  let query = supabase
    .from('claims')
    .select('*, trips(*)')
    .order('created_at', { ascending: false });

  if (role === 'official') query = query.eq('persal', persal);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(normalizeClaim));
});

app.post('/api/claims', requireAuth, async (req, res) => {
  const { user } = req;
  const body    = req.body;
  const trips   = body.trips || [];
  const isDraft = body.status === 'draft';

  // TC-012: server-side required field validation
  const missing = [];
  if (!body.name?.trim())    missing.push('name');
  if (!body.persal?.trim())  missing.push('persal');
  if (!body.purpose?.trim()) missing.push('purpose');
  if (!isDraft) {
    if (!body.reg?.trim())   missing.push('reg');
    if (trips.length === 0)  missing.push('trips');
  }
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const year = new Date().getFullYear();
  const ref  = `TC-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const { data: claim, error: claimErr } = await supabase
    .from('claims')
    .insert({
      ref,
      user_id:      user.id,
      name:         body.name,
      persal:       body.persal,
      dept:         body.dept         || '',
      contact:      body.contact      || '',
      phone:        body.phone        || '',
      purpose:      body.purpose,
      logsheet:     body.logsheet     || '',
      date_from:    body.dateFrom     || null,
      date_to:      body.dateTo       || null,
      vehicle_type: body.vehicleType  || 'motor',
      engine_idx:   body.engineIdx    || '',
      km_bracket:   body.kmBracket    || 'more',
      reg:          body.reg          || '',
      km:           body.km           || 0,
      amount:       body.amount       || 0,
      status:       isDraft ? 'draft' : 'pending',
      docs:         body.docs         || [],
      ...(DB_CAPS.docLinks && { doc_links: body.docLinks || [] }),
      advance:      body.advance      || false,
      adv_a:        body.advA         || 0,
      adv_b:        body.advB         || 0,
      adv_c:        body.advC         || 0,
      alloc_amounts: body.allocAmounts || {},
      sig_name:     body.sigName      || '',
      sig_rank:     body.sigRank      || '',
      sig_date:     body.sigDate      || null,
    })
    .select()
    .single();

  if (claimErr) return res.status(500).json({ error: claimErr.message });

  if (trips.length > 0) {
    const { error: tripErr } = await supabase.from('trips').insert(
      trips.map((t, i) => ({
        claim_id:   claim.id,
        trip_order: i,
        date_from:  t.dateFrom || null,
        date_to:    t.dateTo   || null,
        origin:     t.origin   || '',
        dest:       t.dest     || '',
        km:         t.km       || 0,
      }))
    );
    if (tripErr) return res.status(500).json({ error: tripErr.message });
  }

  // TC-009: re-fetch with trips so the response includes the inserted legs
  const { data: claimWithTrips } = await supabase
    .from('claims')
    .select('*, trips(*)')
    .eq('id', claim.id)
    .single();

  await supabase.from('claim_status_history').insert({
    claim_id:    claim.id,
    from_status: null,
    to_status:   isDraft ? 'draft' : 'pending',
    changed_by:  user.id,
    note:        isDraft ? 'Draft saved' : 'Claim submitted',
  });

  // Notify supervisor(s) on new submission
  if (!isDraft) {
    const supEmails = await getEmailsByRole('supervisor');
    sendEmail({
      to: supEmails,
      subject: `[GPG Claims] New claim submitted — ${ref}`,
      html: emailTemplate('New claim requires approval', `
        <p>A new travel claim has been submitted and is waiting for your approval.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#666;width:140px">Claim ref</td><td style="padding:6px 0;font-weight:bold;font-family:monospace">${ref}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Official</td><td style="padding:6px 0">${body.name}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Department</td><td style="padding:6px 0">${body.dept || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Purpose</td><td style="padding:6px 0">${body.purpose || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0;font-weight:bold">R ${(body.amount || 0).toFixed(2)}</td></tr>
        </table>
        <p style="margin-top:20px">Please log in to review and approve or reject this claim.</p>
      `),
    });
  }

  res.status(201).json(normalizeClaim(claimWithTrips || { ...claim, trips: [], doc_links: body.docLinks || [] }));
});

app.patch('/api/claims/:ref/status', requireAuth, async (req, res) => {
  const { ref } = req.params;
  const { status, note } = req.body;
  const { user } = req;

  const userSel = DB_CAPS.userEmail ? 'users(name, email)' : 'users(name)';
  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select(`id, status, name, persal, dept, purpose, amount, user_id, ${userSel}`)
    .eq('ref', ref)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });

  // TC-036: enforce role-based transition rules
  const ALLOWED = {
    approved:  ['supervisor'],
    rejected:  ['supervisor'],
    paid:      ['hrs'],
    pending:   ['official'],
  };
  const allowedRoles = ALLOWED[status];
  if (!allowedRoles || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden: your role cannot set this status' });
  }

  // When official responds to info request, attach new doc_links
  const updates = { status };
  if (DB_CAPS.docLinks && req.body.docLinks !== undefined) updates.doc_links = req.body.docLinks;

  const { data: updated, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('ref', ref)
    .select('*, trips(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('claim_status_history').insert({
    claim_id:    existing.id,
    from_status: existing.status,
    to_status:   status,
    changed_by:  user.id,
    note:        note || '',
  });

  const officialEmail = existing.users?.email;
  const claimSummary = `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#666;width:140px">Claim ref</td><td style="padding:6px 0;font-weight:bold;font-family:monospace">${ref}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Official</td><td style="padding:6px 0">${existing.name}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Purpose</td><td style="padding:6px 0">${existing.purpose || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0;font-weight:bold">R ${(existing.amount || 0).toFixed(2)}</td></tr>
    </table>`;

  if (status === 'approved') {
    // Notify Internal HR
    const hrEmails = await getEmailsByRole('hrs');
    sendEmail({
      to: hrEmails,
      subject: `[GPG Claims] Claim approved — ${ref}`,
      html: emailTemplate('Claim approved — ready for processing', `
        <p>A claim has been approved by the supervisor and is now in your queue for processing.</p>
        ${claimSummary}
        <p style="margin-top:16px">Please log in to process this claim.</p>
      `),
    });
    // Notify official
    sendEmail({
      to: officialEmail,
      subject: `[GPG Claims] Your claim has been approved — ${ref}`,
      html: emailTemplate('Your claim has been approved', `
        <p>Your travel claim has been approved by your supervisor.</p>
        ${claimSummary}
        <p style="margin-top:16px">It is now with Internal HR for payment processing.</p>
      `),
    });
  }

  if (status === 'rejected') {
    sendEmail({
      to: officialEmail,
      subject: `[GPG Claims] Your claim has been rejected — ${ref}`,
      html: emailTemplate('Your claim has been rejected', `
        <p>Your travel claim has been rejected.</p>
        ${claimSummary}
        ${note ? `<p style="margin-top:12px"><strong>Reason:</strong> ${note}</p>` : ''}
        <p style="margin-top:16px">Please contact your supervisor for further guidance.</p>
      `),
    });
  }

  if (status === 'paid') {
    sendEmail({
      to: officialEmail,
      subject: `[GPG Claims] Your claim has been paid — ${ref}`,
      html: emailTemplate('Your claim has been paid', `
        <p>Your travel claim has been processed and payment has been confirmed.</p>
        ${claimSummary}
        <p style="margin-top:16px;color:#0F6E56;font-weight:bold">Payment has been processed on Persal.</p>
      `),
    });
  }

  res.json(normalizeClaim(updated));
});

// ── Info request endpoint ────────────────────────────────────────────────────

app.post('/api/claims/:ref/request-info', requireAuth, async (req, res) => {
  if (req.user.role !== 'hrs') return res.status(403).json({ error: 'Forbidden' });

  const { ref } = req.params;
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

  const userSel2 = DB_CAPS.userEmail ? 'users(name, email)' : 'users(name)';
  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select(`id, status, name, persal, purpose, amount, user_id, ${userSel2}`)
    .eq('ref', ref)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });
  if (existing.status !== 'approved') {
    return res.status(400).json({ error: 'Can only request info on approved claims' });
  }

  const { data: updated, error } = await supabase
    .from('claims')
    .update({ status: 'info_requested' })
    .eq('ref', ref)
    .select('*, trips(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('claim_status_history').insert({
    claim_id:     existing.id,
    from_status:  'approved',
    to_status:    'info_requested',
    changed_by:   req.user.id,
    note:         message,
    ...(DB_CAPS.infoMessage && { info_message: message }),
  });

  // Notify official
  const officialEmail = existing.users?.email;
  sendEmail({
    to: officialEmail,
    subject: `[GPG Claims] Additional information required — ${ref}`,
    html: emailTemplate('Additional information required for your claim', `
      <p>Internal HR has reviewed your travel claim and requires additional information before it can be processed.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666;width:140px">Claim ref</td><td style="padding:6px 0;font-weight:bold;font-family:monospace">${ref}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Purpose</td><td style="padding:6px 0">${existing.purpose || '—'}</td></tr>
      </table>
      <div style="margin-top:16px;padding:14px;background:#f3f0ff;border-left:3px solid #534AB7;border-radius:4px">
        <p style="margin:0;font-size:13px;color:#666;font-weight:bold">Information requested:</p>
        <p style="margin:8px 0 0;font-size:14px">${message}</p>
      </div>
      <p style="margin-top:16px">Please log in to your claims portal to provide the requested information and resubmit your claim.</p>
    `),
  });

  res.json(normalizeClaim(updated));
});

// ── Official responds to info request ────────────────────────────────────────

app.post('/api/claims/:ref/respond-info', requireAuth, async (req, res) => {
  const { ref } = req.params;
  const { message, docLinks } = req.body;

  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select('id, status, name, purpose, amount')
    .eq('ref', ref)
    .eq('persal', req.user.persal)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });
  if (existing.status !== 'info_requested') {
    return res.status(400).json({ error: 'Claim is not in info_requested state' });
  }

  const updates = { status: 'approved' };
  if (DB_CAPS.docLinks && docLinks) updates.doc_links = docLinks;

  const { data: updated, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('ref', ref)
    .select('*, trips(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('claim_status_history').insert({
    claim_id:     existing.id,
    from_status:  'info_requested',
    to_status:    'approved',
    changed_by:   req.user.id,
    note:         message || 'Additional information provided',
    ...(DB_CAPS.infoMessage && { info_message: message || '' }),
  });

  // Notify Internal HR
  const hrEmails = await getEmailsByRole('hrs');
  sendEmail({
    to: hrEmails,
    subject: `[GPG Claims] Information provided — ${ref}`,
    html: emailTemplate('Official has responded to your information request', `
      <p><strong>${existing.name}</strong> has provided the additional information you requested and the claim is now back in your queue.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666;width:140px">Claim ref</td><td style="padding:6px 0;font-weight:bold;font-family:monospace">${ref}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Purpose</td><td style="padding:6px 0">${existing.purpose || '—'}</td></tr>
      </table>
      ${message ? `<div style="margin-top:16px;padding:14px;background:#f0fdf4;border-left:3px solid #3B6D11;border-radius:4px"><p style="margin:0;font-size:13px;color:#666;font-weight:bold">Response from official:</p><p style="margin:8px 0 0;font-size:14px">${message}</p></div>` : ''}
      <p style="margin-top:16px">Please log in to continue processing this claim.</p>
    `),
  });

  res.json(normalizeClaim(updated));
});

// ── Claim history ────────────────────────────────────────────────────────────

app.get('/api/claims/:ref/history', requireAuth, async (req, res) => {
  const { data: claim } = await supabase
    .from('claims').select('id').eq('ref', req.params.ref).single();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const histSel = `id, from_status, to_status, note${DB_CAPS.infoMessage ? ', info_message' : ''}, created_at, users(name, role)`;
  const { data, error } = await supabase
    .from('claim_status_history')
    .select(histSel)
    .eq('claim_id', claim.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Audit log (admin only) ───────────────────────────────────────────────────

app.get('/api/audit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const auditSel = `id, from_status, to_status, note${DB_CAPS.infoMessage ? ', info_message' : ''}, created_at, users(name, role), claims(ref, name, persal, dept)`;
  const { data, error } = await supabase
    .from('claim_status_history')
    .select(auditSel)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Serve React build in production ─────────────────────────────────────────

if (isProd) {
  const buildDir = path.join(__dirname, '..', 'build');
  app.use(express.static(buildDir));
  app.get(/(.*)/, (req, res) => res.sendFile(path.join(buildDir, 'index.html')));
}

// ── Startup ──────────────────────────────────────────────────────────────────

async function ensureUsersSeeded() {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) return;

  const DEMO = [
    { username: 'dlamini', password: 'pass123',  name: 'T. Dlamini', persal: '20482345', dept: 'GPG — Health',       role: 'official'   },
    { username: 'khumalo', password: 'pass123',  name: 'N. Khumalo', persal: '20481111', dept: 'GPG — Finance',      role: 'supervisor' },
    { username: 'sithole', password: 'pass123',  name: 'B. Sithole', persal: '20489876', dept: 'GPG — Internal HR',  role: 'hrs'        },
    { username: 'admin',   password: 'admin123', name: 'Admin User', persal: '',         dept: 'GPG — System Admin', role: 'admin'      },
  ];

  const { error } = await supabase.from('users').insert(DEMO);
  if (error) {
    console.error('Failed to seed demo users:', error.message);
  } else {
    console.log('Demo users seeded.');
    // Backfill emails if column exists
    if (DB_CAPS.userEmail) {
      const emails = [
        { username: 'dlamini', email: 'official@gpg-demo.gov.za'   },
        { username: 'khumalo', email: 'supervisor@gpg-demo.gov.za'  },
        { username: 'sithole', email: 'internalhr@gpg-demo.gov.za'  },
        { username: 'admin',   email: 'admin@gpg-demo.gov.za'       },
      ];
      for (const { username, email } of emails) {
        await supabase.from('users').update({ email }).eq('username', username);
      }
    }
  }
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`GPG Travel Claims API → http://localhost:${PORT}`);
  await detectDbCapabilities();
  await ensureUsersSeeded();
});
