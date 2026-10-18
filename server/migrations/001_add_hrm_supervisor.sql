-- Migration 001: Add HRM Supervisor role and hrm_pending workflow stage
-- Run this on Azure PostgreSQL (TravelClaims database) after the initial schema.

-- 1. Expand users.role to include hrm_supervisor
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
  'official','supervisor','hrm_supervisor','compiler','verifier','approver','hrs','admin'
));

-- 2. Expand claims.status to include hrm_pending
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE claims ADD CONSTRAINT claims_status_check CHECK (status IN (
  'draft','pending','hrm_pending','approved','compiled','verified',
  'hr_approved','rejected','info_requested','paid'
));

-- 3. Add SLA target for the new allocation stage
INSERT INTO sla_targets (status, working_days, label)
VALUES ('hrm_pending', 2, 'HRM Supervisor allocation')
ON CONFLICT (status) DO NOTHING;

-- 4. Demo HRM Supervisor account
INSERT INTO users (username, password, name, persal, dept, role, email)
VALUES ('pieterse', 'pass123', 'R. Pieterse', '20481555', 'GPG — Internal HR', 'hrm_supervisor', 'hrmsupervisor@gpg-demo.gov.za')
ON CONFLICT (username) DO NOTHING;
