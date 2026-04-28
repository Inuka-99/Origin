-- ============================================================
-- profile extras: job_title + bio
--
-- Profile Settings exposes a Job Title and Bio field. They were
-- previously hardcoded UI placeholders; this migration adds the
-- corresponding nullable columns so the values persist through
-- PATCH /users/me. Idempotent — safe to apply repeatedly.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS bio       TEXT;
