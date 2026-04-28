-- ============================================================================
-- Data Integrity checkpoints
-- ============================================================================
-- Stores admin-created snapshots of database health checks so the workspace can
-- track drift over time and catch potential data-loss risks early.
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_integrity_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status       TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
  score        INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  table_counts JSONB NOT NULL DEFAULT '{}',
  issue_counts JSONB NOT NULL DEFAULT '{}',
  notes        TEXT,
  created_by   TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_integrity_snapshots_created_at
  ON data_integrity_snapshots (created_at DESC);

ALTER TABLE data_integrity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read data integrity snapshots"
  ON data_integrity_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = COALESCE(auth.jwt() ->> 'sub', '')
        AND profiles.role = 'admin'
    )
  );
