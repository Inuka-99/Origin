-- ============================================================================
-- Google Calendar integration tables
-- ============================================================================
-- Stores per-user Google Calendar connections (refresh tokens + settings) and
-- the mapping between Origin tasks and Google Calendar events so the backend
-- can upsert / delete events when tasks change.
--
-- Encryption: refresh_token and access_token columns hold application-layer
-- encrypted ciphertext (AES-256-GCM keyed on GCAL_TOKEN_ENC_KEY). We do NOT
-- rely on pgcrypto here so the encryption boundary stays inside NestJS and
-- the service-role key is never exposed to Postgres extension code paths.
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT NOT NULL UNIQUE,
  google_email            TEXT NOT NULL,
  refresh_token           TEXT NOT NULL,
  access_token            TEXT,
  access_token_expires_at TIMESTAMPTZ,
  calendar_id             TEXT NOT NULL DEFAULT 'primary',
  scopes                  TEXT[] NOT NULL,
  source                  TEXT NOT NULL CHECK (source IN ('auth0_federated', 'standalone_oauth')),
  needs_reconnect         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gcal_connections_user_id
  ON google_calendar_connections (user_id);

CREATE TABLE IF NOT EXISTS google_calendar_task_events (
  task_id         UUID NOT NULL,
  user_id         TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  calendar_id     TEXT NOT NULL,
  etag            TEXT,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gcal_task_events_user_id
  ON google_calendar_task_events (user_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- The backend uses the service-role key so RLS is effectively bypassed for
-- server writes, but we still enable RLS + scoped policies so that if a
-- future code path uses the anon key or a user JWT, users can only see their
-- own rows. user_id stores the Auth0 `sub` claim; with Supabase JWT auth we
-- match on auth.jwt() ->> 'sub'.
-- ----------------------------------------------------------------------------

ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own gcal connection"
  ON google_calendar_connections
  FOR SELECT
  USING (user_id = COALESCE(auth.jwt() ->> 'sub', ''));

CREATE POLICY "users read own gcal task events"
  ON google_calendar_task_events
  FOR SELECT
  USING (user_id = COALESCE(auth.jwt() ->> 'sub', ''));

-- ----------------------------------------------------------------------------
-- updated_at trigger for connections
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_gcal_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gcal_connections_updated_at ON google_calendar_connections;
CREATE TRIGGER trg_gcal_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION set_gcal_connections_updated_at();
