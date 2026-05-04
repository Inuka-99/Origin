-- ============================================================
-- Task approval workflow support
-- Adds approval state without hiding existing tasks retroactively.
-- Existing rows remain approved by default.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by TEXT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_approval_status_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_approval_status
  ON tasks (approval_status);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by_approval_status
  ON tasks (created_by, approval_status);
