-- Run this in your Supabase dashboard → SQL editor
-- Project: occtdvevcmafivffwxdi

-- 1. Add info_requested status to claims
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE claims ADD CONSTRAINT claims_status_check
  CHECK (status IN ('draft','pending','approved','rejected','info_requested','paid','ecm','routed'));

-- 2. Add email address to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add info_message to status history (stores the request/response message)
ALTER TABLE claim_status_history ADD COLUMN IF NOT EXISTS info_message TEXT;

-- 4. Add document links to claims (stores [{name, url}] for downloadable files)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS doc_links JSONB DEFAULT '[]'::jsonb;

-- 5. Seed demo user emails
UPDATE users SET email = 'official@gpg-demo.gov.za'   WHERE username = 'dlamini';
UPDATE users SET email = 'supervisor@gpg-demo.gov.za'  WHERE username = 'khumalo';
UPDATE users SET email = 'internalhr@gpg-demo.gov.za'  WHERE username = 'sithole';
UPDATE users SET email = 'mokoena@gpg-demo.gov.za'     WHERE username = 'mokoena';
UPDATE users SET email = 'nkosi@gpg-demo.gov.za'       WHERE username = 'nkosi';
UPDATE users SET email = 'admin@gpg-demo.gov.za'       WHERE username = 'admin';
