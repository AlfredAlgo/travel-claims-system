require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gpg-travel-dev-secret-change-in-prod';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

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
  // all other roles receive all claims; front-end filters by status per page

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(normalizeClaim));
});

app.post('/api/claims', requireAuth, async (req, res) => {
  const { user } = req;
  const body    = req.body;
  const trips   = body.trips || [];
  const isDraft = body.status === 'draft';

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

  await supabase.from('claim_status_history').insert({
    claim_id:    claim.id,
    from_status: null,
    to_status:   isDraft ? 'draft' : 'pending',
    changed_by:  user.id,
    note:        isDraft ? 'Draft saved' : 'Claim submitted',
  });

  res.status(201).json(normalizeClaim({ ...claim, trips: [] }));
});

app.patch('/api/claims/:ref/status', requireAuth, async (req, res) => {
  const { ref } = req.params;
  const { status, mandate, note } = req.body;
  const { user } = req;

  const { data: existing, error: fetchErr } = await supabase
    .from('claims')
    .select('id, status')
    .eq('ref', ref)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Claim not found' });

  const updates = { status };
  if (mandate) updates.mandate = mandate;

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

  res.json(normalizeClaim(updated));
});

// ── Claim history ────────────────────────────────────────────────────────────

app.get('/api/claims/:ref/history', requireAuth, async (req, res) => {
  const { data: claim } = await supabase
    .from('claims').select('id').eq('ref', req.params.ref).single();
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const { data, error } = await supabase
    .from('claim_status_history')
    .select('id, from_status, to_status, note, created_at, users(name, role)')
    .eq('claim_id', claim.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Audit log (admin only) ───────────────────────────────────────────────────

app.get('/api/audit', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { data, error } = await supabase
    .from('claim_status_history')
    .select('id, from_status, to_status, note, created_at, users(name, role), claims(ref, name, persal, dept)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Startup ──────────────────────────────────────────────────────────────────

async function ensureUsersSeeded() {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) return;

  const DEMO = [
    { username: 'dlamini', password: 'pass123',  name: 'T. Dlamini', persal: '20482345', dept: 'GPG — Health',       role: 'official'   },
    { username: 'khumalo', password: 'pass123',  name: 'N. Khumalo', persal: '20481111', dept: 'GPG — Finance',      role: 'supervisor' },
    { username: 'sithole', password: 'pass123',  name: 'B. Sithole', persal: '20489876', dept: 'GPG — HRS Payroll',  role: 'hrs'        },
    { username: 'mokoena', password: 'pass123',  name: 'P. Mokoena', persal: '20481234', dept: 'GPG — ECM Admin',    role: 'ecm'        },
    { username: 'nkosi',   password: 'pass123',  name: 'L. Nkosi',   persal: '20483456', dept: 'GPG — DMC Payroll',  role: 'dmc'        },
    { username: 'admin',   password: 'admin123', name: 'Admin User', persal: '',         dept: 'GPG — System Admin', role: 'admin'      },
  ];
  await supabase.from('users').insert(DEMO);
  console.log('Demo users seeded.');
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`GPG Travel Claims API → http://localhost:${PORT}`);
  await ensureUsersSeeded();
});
