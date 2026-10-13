#!/usr/bin/env node
/**
 * Migrate data from Supabase PostgreSQL → Azure PostgreSQL
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" \
 *   AZURE_DB_URL="postgresql://[user]@pg-processautomations-preprod:[pass]@pg-processautomations-preprod.postgres.database.azure.com:5432/[dbname]?sslmode=require" \
 *   node server/scripts/migrate-from-supabase.js
 *
 * Prerequisites:
 *   npm install pg   (already in package.json after the server rewrite)
 *
 * Notes:
 *   - Run 000_schema_azure.sql on the Azure DB FIRST before running this script.
 *   - The script is idempotent: it skips rows that already exist (ON CONFLICT DO NOTHING).
 *   - claim_attachments may be large (base64 files). Allow 5–15 min for large datasets.
 *   - Run with Node 18+ for native fetch support.
 */

'use strict';

const { Pool } = require('pg');

const SRC_URL   = process.env.SUPABASE_DB_URL;
const DEST_URL  = process.env.AZURE_DB_URL;
const BATCH     = parseInt(process.env.BATCH_SIZE || '100', 10);

if (!SRC_URL || !DEST_URL) {
  console.error('❌  Set SUPABASE_DB_URL and AZURE_DB_URL environment variables');
  process.exit(1);
}

const src  = new Pool({ connectionString: SRC_URL,  ssl: { rejectUnauthorized: false } });
const dest = new Pool({ connectionString: DEST_URL, ssl: { rejectUnauthorized: false } });

async function copyTable(table, orderCol, insertFn) {
  let offset = 0;
  let total  = 0;
  process.stdout.write(`  ${table} … `);

  while (true) {
    const { rows } = await src.query(
      `SELECT * FROM ${table} ORDER BY ${orderCol} LIMIT $1 OFFSET $2`,
      [BATCH, offset]
    );
    if (rows.length === 0) break;

    await Promise.all(rows.map(insertFn));
    total  += rows.length;
    offset += rows.length;
    process.stdout.write(`${total} `);
  }
  console.log(`✓`);
  return total;
}

async function run() {
  console.log('\n=== GPG Travel Claims — Supabase → Azure Migration ===\n');

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  await copyTable('users', 'id', async (u) => {
    await dest.query(`
      INSERT INTO users (id, username, password, name, persal, dept, role, email, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (username) DO NOTHING`,
      [u.id, u.username, u.password, u.name, u.persal || '', u.dept || '', u.role, u.email || null, u.created_at]
    );
  });

  // Sync the BIGSERIAL sequence so new inserts don't collide
  await dest.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))`);
  console.log('  users sequence synced ✓');

  // ── 2. CLAIMS ─────────────────────────────────────────────────────────────
  await copyTable('claims', 'created_at', async (c) => {
    await dest.query(`
      INSERT INTO claims (
        id, ref, user_id, name, persal, dept, contact, phone, purpose, logsheet,
        date_from, date_to, vehicle_type, engine_idx, km_bracket, vehicle_category,
        fuel_type, engine_band, weight_band, tariff_rate, persal_ref, reimbursement_scheme,
        is_late_submission, late_submission_reason, duplicate_exception, duplicate_exception_note,
        reg, km, amount, advance, adv_a, adv_b, adv_c, alloc_amounts, mandate,
        sig_name, sig_rank, sig_date, docs, doc_links, status,
        feedback_recipient_role, feedback_return_status, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,
        $23,$24,$25,$26,
        $27,$28,$29,$30,$31,$32,$33,$34,$35,
        $36,$37,$38,$39,$40,$41,
        $42,$43,$44,$45
      )
      ON CONFLICT (ref) DO NOTHING`,
      [
        c.id, c.ref, c.user_id, c.name, c.persal, c.dept||'', c.contact||'', c.phone||'',
        c.purpose||'', c.logsheet||'',
        c.date_from, c.date_to, c.vehicle_type||'', c.engine_idx||'', c.km_bracket||'',
        c.vehicle_category||'A',
        c.fuel_type||'petrol', c.engine_band||'', c.weight_band||'',
        c.tariff_rate||0, c.persal_ref||'', c.reimbursement_scheme||'private',
        c.is_late_submission||false, c.late_submission_reason||'',
        c.duplicate_exception||false, c.duplicate_exception_note||'',
        c.reg||'', c.km||0, c.amount||0, c.advance||false,
        c.adv_a||0, c.adv_b||0, c.adv_c||0,
        c.alloc_amounts || '{}', c.mandate||'',
        c.sig_name||'', c.sig_rank||'', c.sig_date,
        c.docs || '[]', c.doc_links || '[]', c.status,
        c.feedback_recipient_role||null, c.feedback_return_status||null,
        c.created_at, c.updated_at || c.created_at,
      ]
    );
  });

  // ── 3. TRIPS ─────────────────────────────────────────────────────────────
  await copyTable('trips', 'created_at', async (t) => {
    await dest.query(`
      INSERT INTO trips (id, claim_id, trip_order, date_from, date_to, origin, dest, km, reason, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO NOTHING`,
      [t.id, t.claim_id, t.trip_order||0, t.date_from, t.date_to, t.origin||'', t.dest||'', t.km||0, t.reason||'', t.created_at]
    );
  });

  // ── 4. CLAIM STATUS HISTORY ───────────────────────────────────────────────
  await copyTable('claim_status_history', 'created_at', async (h) => {
    await dest.query(`
      INSERT INTO claim_status_history (id, claim_id, from_status, to_status, changed_by, note, info_message, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO NOTHING`,
      [h.id, h.claim_id, h.from_status, h.to_status, h.changed_by, h.note||'', h.info_message||null, h.created_at]
    );
  });

  // ── 5. CLAIM ATTACHMENTS ──────────────────────────────────────────────────
  console.log('  claim_attachments (may be slow — contains file data) …');
  await copyTable('claim_attachments', 'created_at', async (a) => {
    await dest.query(`
      INSERT INTO claim_attachments (id, claim_id, field_key, file_name, file_data, mime_type, file_size, uploaded_by, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING`,
      [a.id, a.claim_id, a.field_key||'general', a.file_name, a.file_data, a.mime_type||'application/octet-stream', a.file_size||0, a.uploaded_by, a.created_at]
    );
  });

  // ── 6. TARIFF SCHEDULES + RATES ───────────────────────────────────────────
  await copyTable('tariff_schedules', 'created_at', async (s) => {
    await dest.query(`
      INSERT INTO tariff_schedules (id, circular_ref, effective_date, notes, created_by, created_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (circular_ref, effective_date) DO NOTHING`,
      [s.id, s.circular_ref, s.effective_date, s.notes||'', s.created_by, s.created_at]
    );
  });

  await copyTable('tariff_rates', 'created_at', async (r) => {
    await dest.query(`
      INSERT INTO tariff_rates (id, schedule_id, category, fuel_type, band, scheme, rate_rand, persal_ref, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING`,
      [r.id, r.schedule_id, r.category, r.fuel_type||'petrol', r.band, r.scheme||'private', r.rate_rand, r.persal_ref||'', r.created_at]
    );
  });

  // ── 7. DELEGATIONS ────────────────────────────────────────────────────────
  await copyTable('delegations', 'created_at', async (d) => {
    await dest.query(`
      INSERT INTO delegations (id, delegator_id, delegate_id, role, start_date, end_date, reason, active, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING`,
      [d.id, d.delegator_id, d.delegate_id, d.role, d.start_date, d.end_date, d.reason||'', d.active, d.created_at]
    );
  });

  // ── 8. SLA TARGETS ────────────────────────────────────────────────────────
  const { rows: slaRows } = await src.query('SELECT * FROM sla_targets');
  for (const s of slaRows) {
    await dest.query(`
      INSERT INTO sla_targets (id, status, working_days, label, created_at)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (status) DO UPDATE SET working_days = EXCLUDED.working_days, label = EXCLUDED.label`,
      [s.id, s.status, s.working_days, s.label||'', s.created_at]
    );
  }
  console.log(`  sla_targets … ${slaRows.length} ✓`);

  // ── Row counts ────────────────────────────────────────────────────────────
  console.log('\n=== Row counts on Azure after migration ===');
  const tables = ['users','claims','trips','claim_status_history','claim_attachments','tariff_schedules','tariff_rates','delegations','sla_targets'];
  for (const t of tables) {
    const { rows } = await dest.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t.padEnd(25)} ${rows[0].count}`);
  }

  console.log('\n✅  Migration complete.\n');
}

run()
  .catch(err => { console.error('\n❌ Migration failed:', err.message); process.exit(1); })
  .finally(() => { src.end(); dest.end(); });
