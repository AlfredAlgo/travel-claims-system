-- =============================================================================
-- GPG Travel Claims System — Full schema for Azure PostgreSQL
-- Run this on a fresh Azure PostgreSQL database before migrating data.
-- Compatible with: Azure Database for PostgreSQL Flexible Server
-- =============================================================================

-- gen_random_uuid() is built-in from PostgreSQL 13+ — no extension needed.
-- Azure Database for PostgreSQL does not allow pgcrypto by default.

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id         BIGSERIAL PRIMARY KEY,
  username   VARCHAR(100) UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  name       TEXT NOT NULL,
  persal     TEXT DEFAULT '',
  dept       TEXT DEFAULT '',
  role       TEXT NOT NULL CHECK (role IN ('official','supervisor','compiler','verifier','approver','hrs','admin')),
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CLAIMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS claims (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ref                      VARCHAR(30) UNIQUE NOT NULL,
  user_id                  BIGINT      REFERENCES users(id),

  -- Claimant details
  name                     TEXT        NOT NULL,
  persal                   TEXT        NOT NULL,
  dept                     TEXT        DEFAULT '',
  contact                  TEXT        DEFAULT '',
  phone                    TEXT        DEFAULT '',

  -- Trip summary
  purpose                  TEXT        DEFAULT '',
  logsheet                 TEXT        DEFAULT '',
  date_from                DATE,
  date_to                  DATE,

  -- Legacy vehicle fields (pre-T118 claims)
  vehicle_type             TEXT        DEFAULT '',
  engine_idx               TEXT        DEFAULT '',
  km_bracket               TEXT        DEFAULT '',

  -- T118 vehicle fields
  vehicle_category         VARCHAR(5)  DEFAULT 'A',
  fuel_type                VARCHAR(10) DEFAULT 'petrol',
  engine_band              VARCHAR(50) DEFAULT '',
  weight_band              VARCHAR(50) DEFAULT '',
  tariff_rate              NUMERIC(10,4) DEFAULT 0,
  persal_ref               VARCHAR(20) DEFAULT '',
  reimbursement_scheme     VARCHAR(30) DEFAULT 'private',
  is_late_submission       BOOLEAN     DEFAULT false,
  late_submission_reason   TEXT        DEFAULT '',
  duplicate_exception      BOOLEAN     DEFAULT false,
  duplicate_exception_note TEXT        DEFAULT '',

  -- Vehicle registration
  reg                      TEXT        DEFAULT '',

  -- Financials
  km                       NUMERIC(10,2) DEFAULT 0,
  amount                   NUMERIC(12,2) DEFAULT 0,
  advance                  BOOLEAN     DEFAULT false,
  adv_a                    NUMERIC(12,2) DEFAULT 0,
  adv_b                    NUMERIC(12,2) DEFAULT 0,
  adv_c                    NUMERIC(12,2) DEFAULT 0,
  alloc_amounts            JSONB       DEFAULT '{}',
  mandate                  TEXT        DEFAULT '',

  -- Signatories
  sig_name                 TEXT        DEFAULT '',
  sig_rank                 TEXT        DEFAULT '',
  sig_date                 DATE,

  -- Documents (legacy checkbox list + links)
  docs                     JSONB       DEFAULT '[]',
  doc_links                JSONB       DEFAULT '[]',

  -- Workflow status
  status                   TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN (
                               'draft','pending','approved','compiled','verified',
                               'hr_approved','rejected','info_requested','paid'
                             )),

  -- Feedback routing
  feedback_recipient_role  TEXT,
  feedback_return_status   TEXT,

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_persal  ON claims(persal);
CREATE INDEX IF NOT EXISTS idx_claims_status  ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_claims_updated_at ON claims;
CREATE TRIGGER trg_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TRIPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS trips (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id    UUID          NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  trip_order  INTEGER       DEFAULT 0,
  date_from   DATE,
  date_to     DATE,
  origin      TEXT          DEFAULT '',
  dest        TEXT          DEFAULT '',
  km          NUMERIC(10,2) DEFAULT 0,
  reason      TEXT          DEFAULT '',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_claim_id ON trips(claim_id);

-- =============================================================================
-- CLAIM STATUS HISTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS claim_status_history (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id     UUID        NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT        NOT NULL,
  changed_by   BIGINT      REFERENCES users(id),
  note         TEXT        DEFAULT '',
  info_message TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_claim_id ON claim_status_history(claim_id);

-- =============================================================================
-- CLAIM ATTACHMENTS  (base64 stored in DB)
-- =============================================================================
CREATE TABLE IF NOT EXISTS claim_attachments (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id    UUID         NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  field_key   VARCHAR(50)  NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_data   TEXT         NOT NULL,
  mime_type   VARCHAR(100) DEFAULT 'application/octet-stream',
  file_size   INTEGER      DEFAULT 0,
  uploaded_by BIGINT       REFERENCES users(id),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_claim_id ON claim_attachments(claim_id);

-- =============================================================================
-- TARIFF SCHEDULES
-- =============================================================================
CREATE TABLE IF NOT EXISTS tariff_schedules (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  circular_ref   VARCHAR(50) NOT NULL,
  effective_date DATE        NOT NULL,
  notes          TEXT        DEFAULT '',
  created_by     BIGINT      REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circular_ref, effective_date)
);

CREATE TABLE IF NOT EXISTS tariff_rates (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID          NOT NULL REFERENCES tariff_schedules(id) ON DELETE CASCADE,
  category    VARCHAR(5)    NOT NULL,
  fuel_type   VARCHAR(10)   NOT NULL DEFAULT 'petrol',
  band        VARCHAR(50)   NOT NULL,
  scheme      VARCHAR(30)   NOT NULL DEFAULT 'private',
  rate_rand   NUMERIC(10,4) NOT NULL,
  persal_ref  VARCHAR(20)   DEFAULT '',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- DELEGATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS delegations (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  delegator_id BIGINT      NOT NULL REFERENCES users(id),
  delegate_id  BIGINT      NOT NULL REFERENCES users(id),
  role         TEXT        NOT NULL,
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  reason       TEXT        DEFAULT '',
  active       BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_delegation_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_no_self_delegation CHECK (delegator_id <> delegate_id)
);

-- =============================================================================
-- SLA TARGETS
-- =============================================================================
CREATE TABLE IF NOT EXISTS sla_targets (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  status       VARCHAR(20) NOT NULL UNIQUE,
  working_days INTEGER     NOT NULL DEFAULT 5,
  label        TEXT        DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sla_targets (status, working_days, label) VALUES
  ('pending',     5, 'Supervisor approval'),
  ('approved',    3, 'Compiler processing'),
  ('compiled',    2, 'Verifier check'),
  ('verified',    2, 'HR Approver sign-off'),
  ('hr_approved', 5, 'HRS payment processing')
ON CONFLICT (status) DO NOTHING;

-- =============================================================================
-- SEED: T118 tariff schedule (effective 1 Aug 2026)
-- =============================================================================
INSERT INTO tariff_schedules (circular_ref, effective_date, notes)
VALUES ('T118', '2026-08-01', 'DoT circular T118 — effective 1 August 2026')
ON CONFLICT (circular_ref, effective_date) DO NOTHING;

-- =============================================================================
-- SEED: Demo / test user accounts
-- Passwords are plain-text for demo purposes only — replace before go-live.
-- =============================================================================
INSERT INTO users (username, password, name, persal, dept, role, email) VALUES
  ('dlamini', 'pass123',  'T. Dlamini', '20482345', 'GPG — Health',       'official',  'official@gpg-demo.gov.za'),
  ('khumalo', 'pass123',  'N. Khumalo', '20481111', 'GPG — Finance',      'supervisor','supervisor@gpg-demo.gov.za'),
  ('mokoena', 'pass123',  'P. Mokoena', '20481222', 'GPG — Internal HR',  'compiler',  'compiler@gpg-demo.gov.za'),
  ('nkosi',   'pass123',  'L. Nkosi',   '20481333', 'GPG — Internal HR',  'verifier',  'verifier@gpg-demo.gov.za'),
  ('dube',    'pass123',  'S. Dube',    '20481444', 'GPG — Internal HR',  'approver',  'approver@gpg-demo.gov.za'),
  ('sithole', 'pass123',  'B. Sithole', '20489876', 'GPG — Internal HR',  'hrs',       'internalhr@gpg-demo.gov.za'),
  ('admin',   'admin123', 'Admin User', '',          'GPG — System Admin', 'admin',     'admin@gpg-demo.gov.za')
ON CONFLICT (username) DO NOTHING;
