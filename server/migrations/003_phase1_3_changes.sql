-- Migration 003: Phase 1–3 changes
-- Vehicle categories (T118), 6-stage workflow, file attachments, new HR roles

-- 1. Update claims status constraint
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE claims ADD CONSTRAINT claims_status_check
  CHECK (status IN (
    'draft','pending','approved','compiled','verified','hr_approved',
    'rejected','info_requested','paid'
  ));

-- 2. Add new vehicle / tariff fields
ALTER TABLE claims ADD COLUMN IF NOT EXISTS vehicle_category    VARCHAR(5)      DEFAULT 'A';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fuel_type           VARCHAR(10)     DEFAULT 'petrol';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS engine_band         VARCHAR(50)     DEFAULT '';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS weight_band         VARCHAR(50)     DEFAULT '';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS tariff_rate         NUMERIC(10,4)   DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS persal_ref          VARCHAR(20)     DEFAULT '';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS reimbursement_scheme VARCHAR(30)    DEFAULT 'private';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_late_submission   BOOLEAN        DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS late_submission_reason TEXT         DEFAULT '';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS duplicate_exception  BOOLEAN        DEFAULT false;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS duplicate_exception_note TEXT       DEFAULT '';

-- 3. Versioned tariff schedules
CREATE TABLE IF NOT EXISTS tariff_schedules (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  circular_ref   VARCHAR(50) NOT NULL,
  effective_date DATE        NOT NULL,
  notes          TEXT        DEFAULT '',
  created_by     UUID        REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circular_ref, effective_date)
);

-- 4. Individual tariff rates per schedule
CREATE TABLE IF NOT EXISTS tariff_rates (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID          REFERENCES tariff_schedules(id) ON DELETE CASCADE,
  category    VARCHAR(5)    NOT NULL,
  fuel_type   VARCHAR(10)   NOT NULL DEFAULT 'petrol',
  band        VARCHAR(50)   NOT NULL,
  scheme      VARCHAR(30)   NOT NULL DEFAULT 'private',
  rate_rand   NUMERIC(10,4) NOT NULL,
  persal_ref  VARCHAR(20)   DEFAULT '',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- 5. File attachments (stored as base64)
CREATE TABLE IF NOT EXISTS claim_attachments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id    UUID        REFERENCES claims(id) ON DELETE CASCADE,
  field_key   VARCHAR(50) NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_data   TEXT        NOT NULL,
  mime_type   VARCHAR(100) DEFAULT 'application/octet-stream',
  file_size   INTEGER     DEFAULT 0,
  uploaded_by UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Update users role constraint to include new HR chain roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('official','supervisor','compiler','verifier','approver','hrs','admin'));

-- 7. Seed new demo users for compiler / verifier / approver
INSERT INTO users (username, password, name, persal, dept, role, email)
VALUES
  ('mokoena','pass123','P. Mokoena','20481222','GPG — Internal HR','compiler', 'compiler@gpg-demo.gov.za'),
  ('nkosi',  'pass123','L. Nkosi',  '20481333','GPG — Internal HR','verifier', 'verifier@gpg-demo.gov.za'),
  ('dube',   'pass123','S. Dube',   '20481444','GPG — Internal HR','approver', 'approver@gpg-demo.gov.za')
ON CONFLICT (username) DO NOTHING;

-- 8. Seed T118 tariff schedule reference
INSERT INTO tariff_schedules (circular_ref, effective_date, notes)
VALUES (
  'T118',
  '2026-08-01',
  'Department of Transport circular T118 — effective 1 August 2026'
)
ON CONFLICT (circular_ref, effective_date) DO NOTHING;
