-- ============================================================
-- GPG Travel Claims System — Azure SQL (T-SQL) Schema
-- Run this once on your dedicated Travel Claims database.
-- All CREATE statements are idempotent (IF NOT EXISTS).
-- ============================================================

-- ── USERS ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
BEGIN
  CREATE TABLE users (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    username   NVARCHAR(100)    NOT NULL,
    password   NVARCHAR(255)    NOT NULL DEFAULT '',
    name       NVARCHAR(255)    NOT NULL DEFAULT '',
    persal     NVARCHAR(50)     NOT NULL DEFAULT '',
    dept       NVARCHAR(255)    NOT NULL DEFAULT '',
    role       NVARCHAR(50)     NOT NULL DEFAULT 'official',
    email      NVARCHAR(255)    NULL,
    created_at DATETIME2        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT ck_users_role CHECK (role IN (
      'official','supervisor','hrm_supervisor','compiler',
      'verifier','approver','hrs','admin'
    ))
  );
END;

-- ── CLAIMS ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'claims')
BEGIN
  CREATE TABLE claims (
    id                       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ref                      NVARCHAR(50)     NOT NULL,
    user_id                  UNIQUEIDENTIFIER NULL REFERENCES users(id),
    name                     NVARCHAR(255)    NOT NULL DEFAULT '',
    persal                   NVARCHAR(50)     NOT NULL DEFAULT '',
    dept                     NVARCHAR(255)    NOT NULL DEFAULT '',
    contact                  NVARCHAR(255)    NOT NULL DEFAULT '',
    phone                    NVARCHAR(50)     NOT NULL DEFAULT '',
    purpose                  NVARCHAR(MAX)    NOT NULL DEFAULT '',
    logsheet                 NVARCHAR(MAX)    NOT NULL DEFAULT '',
    date_from                DATE             NULL,
    date_to                  DATE             NULL,
    vehicle_type             NVARCHAR(50)     NOT NULL DEFAULT '',
    engine_idx               NVARCHAR(50)     NOT NULL DEFAULT '',
    km_bracket               NVARCHAR(50)     NOT NULL DEFAULT '',
    vehicle_category         NVARCHAR(10)     NOT NULL DEFAULT 'A',
    fuel_type                NVARCHAR(20)     NOT NULL DEFAULT 'petrol',
    engine_band              NVARCHAR(50)     NOT NULL DEFAULT '',
    weight_band              NVARCHAR(50)     NOT NULL DEFAULT '',
    tariff_rate              DECIMAL(18,4)    NOT NULL DEFAULT 0,
    persal_ref               NVARCHAR(100)    NOT NULL DEFAULT '',
    reimbursement_scheme     NVARCHAR(50)     NOT NULL DEFAULT 'private',
    is_late_submission       BIT              NOT NULL DEFAULT 0,
    late_submission_reason   NVARCHAR(MAX)    NOT NULL DEFAULT '',
    duplicate_exception      BIT              NOT NULL DEFAULT 0,
    duplicate_exception_note NVARCHAR(MAX)    NOT NULL DEFAULT '',
    reg                      NVARCHAR(50)     NOT NULL DEFAULT '',
    km                       DECIMAL(18,3)    NOT NULL DEFAULT 0,
    amount                   DECIMAL(18,2)    NOT NULL DEFAULT 0,
    status                   NVARCHAR(30)     NOT NULL DEFAULT 'draft',
    docs                     NVARCHAR(MAX)    NOT NULL DEFAULT '[]',
    doc_links                NVARCHAR(MAX)    NOT NULL DEFAULT '[]',
    advance                  BIT              NOT NULL DEFAULT 0,
    adv_a                    DECIMAL(18,2)    NOT NULL DEFAULT 0,
    adv_b                    DECIMAL(18,2)    NOT NULL DEFAULT 0,
    adv_c                    DECIMAL(18,2)    NOT NULL DEFAULT 0,
    alloc_amounts            NVARCHAR(MAX)    NOT NULL DEFAULT '{}',
    mandate                  NVARCHAR(MAX)    NOT NULL DEFAULT '',
    sig_name                 NVARCHAR(255)    NOT NULL DEFAULT '',
    sig_rank                 NVARCHAR(255)    NOT NULL DEFAULT '',
    sig_date                 DATE             NULL,
    feedback_recipient_role  NVARCHAR(50)     NULL,
    feedback_return_status   NVARCHAR(30)     NULL,
    created_at               DATETIME2        NOT NULL DEFAULT GETDATE(),
    updated_at               DATETIME2        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT uq_claims_ref UNIQUE (ref),
    CONSTRAINT ck_claims_status CHECK (status IN (
      'draft','pending','hrm_pending','approved','compiled',
      'verified','hr_approved','rejected','info_requested','paid'
    ))
  );
END;

-- Auto-update updated_at on claims
IF NOT EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_claims_updated_at')
EXEC('
  CREATE TRIGGER trg_claims_updated_at ON claims AFTER UPDATE AS
  BEGIN
    SET NOCOUNT ON;
    UPDATE claims SET updated_at = GETDATE()
    WHERE id IN (SELECT id FROM inserted);
  END
');

-- ── TRIPS ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'trips')
BEGIN
  CREATE TABLE trips (
    id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    claim_id   UNIQUEIDENTIFIER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    trip_order INT              NOT NULL DEFAULT 0,
    date_from  DATE             NULL,
    date_to    DATE             NULL,
    origin     NVARCHAR(255)    NOT NULL DEFAULT '',
    dest       NVARCHAR(255)    NOT NULL DEFAULT '',
    km         DECIMAL(18,3)    NOT NULL DEFAULT 0,
    created_at DATETIME2        NOT NULL DEFAULT GETDATE()
  );
END;

-- ── CLAIM STATUS HISTORY ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'claim_status_history')
BEGIN
  CREATE TABLE claim_status_history (
    id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    claim_id     UNIQUEIDENTIFIER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    from_status  NVARCHAR(30)     NULL,
    to_status    NVARCHAR(30)     NOT NULL,
    changed_by   UNIQUEIDENTIFIER NULL REFERENCES users(id),
    note         NVARCHAR(MAX)    NOT NULL DEFAULT '',
    info_message NVARCHAR(MAX)    NULL,
    created_at   DATETIME2        NOT NULL DEFAULT GETDATE()
  );
END;

-- ── CLAIM ATTACHMENTS ────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'claim_attachments')
BEGIN
  CREATE TABLE claim_attachments (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    claim_id    UNIQUEIDENTIFIER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    field_key   NVARCHAR(100)    NOT NULL DEFAULT 'general',
    file_name   NVARCHAR(500)    NOT NULL DEFAULT '',
    file_data   NVARCHAR(MAX)    NOT NULL DEFAULT '',
    mime_type   NVARCHAR(100)    NOT NULL DEFAULT 'application/octet-stream',
    file_size   INT              NOT NULL DEFAULT 0,
    uploaded_by UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at  DATETIME2        NOT NULL DEFAULT GETDATE()
  );
END;

-- ── TARIFF SCHEDULES ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tariff_schedules')
BEGIN
  CREATE TABLE tariff_schedules (
    id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    circular_ref   NVARCHAR(100)    NOT NULL DEFAULT '',
    effective_date DATE             NOT NULL,
    notes          NVARCHAR(MAX)    NOT NULL DEFAULT '',
    created_by     UNIQUEIDENTIFIER NULL REFERENCES users(id),
    created_at     DATETIME2        NOT NULL DEFAULT GETDATE()
  );
END;

-- ── TARIFF RATES ─────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'tariff_rates')
BEGIN
  CREATE TABLE tariff_rates (
    id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    schedule_id UNIQUEIDENTIFIER NOT NULL REFERENCES tariff_schedules(id) ON DELETE CASCADE,
    category    NVARCHAR(10)     NOT NULL DEFAULT '',
    fuel_type   NVARCHAR(20)     NOT NULL DEFAULT 'petrol',
    band        NVARCHAR(50)     NOT NULL DEFAULT '',
    scheme      NVARCHAR(20)     NOT NULL DEFAULT 'private',
    rate_rand   DECIMAL(18,4)    NOT NULL DEFAULT 0,
    persal_ref  NVARCHAR(100)    NOT NULL DEFAULT ''
  );
END;

-- ── DELEGATIONS ──────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'delegations')
BEGIN
  CREATE TABLE delegations (
    id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    delegator_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    delegate_id  UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    role         NVARCHAR(50)     NOT NULL DEFAULT '',
    start_date   DATE             NOT NULL,
    end_date     DATE             NOT NULL,
    reason       NVARCHAR(MAX)    NOT NULL DEFAULT '',
    active       BIT              NOT NULL DEFAULT 1,
    created_at   DATETIME2        NOT NULL DEFAULT GETDATE()
  );
END;

-- ── SLA TARGETS ──────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'sla_targets')
BEGIN
  CREATE TABLE sla_targets (
    status       NVARCHAR(30)  NOT NULL PRIMARY KEY,
    working_days INT           NOT NULL DEFAULT 5,
    label        NVARCHAR(255) NOT NULL DEFAULT ''
  );

  INSERT INTO sla_targets (status, working_days, label) VALUES
    ('pending',     5, 'Supervisor approval'),
    ('hrm_pending', 2, 'HRM Supervisor allocation'),
    ('approved',    3, 'Compiler processing'),
    ('compiled',    2, 'Verifier check'),
    ('verified',    2, 'HR Approver sign-off'),
    ('hr_approved', 5, 'HRS payment processing');
END;

-- ── INDEXES ──────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_claims_persal' AND object_id = OBJECT_ID('claims'))
  CREATE INDEX idx_claims_persal ON claims (persal);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_claims_status' AND object_id = OBJECT_ID('claims'))
  CREATE INDEX idx_claims_status ON claims (status);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trips_claim_id' AND object_id = OBJECT_ID('trips'))
  CREATE INDEX idx_trips_claim_id ON trips (claim_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_csh_claim_id' AND object_id = OBJECT_ID('claim_status_history'))
  CREATE INDEX idx_csh_claim_id ON claim_status_history (claim_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_attach_claim_id' AND object_id = OBJECT_ID('claim_attachments'))
  CREATE INDEX idx_attach_claim_id ON claim_attachments (claim_id);
