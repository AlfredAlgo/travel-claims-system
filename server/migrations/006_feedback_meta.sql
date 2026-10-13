-- Phase 6: Generalised feedback/changes-request columns
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS feedback_recipient_role TEXT,
  ADD COLUMN IF NOT EXISTS feedback_return_status  TEXT;
