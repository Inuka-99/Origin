-- ============================================================
-- Activity Log table for Origin Task Manager
-- Tracks edits, status changes, and assignments for transparency.
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Who performed the action
  user_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- What type of action (task_created, task_updated, status_changed,
  -- assigned, unassigned, project_created, project_updated, project_deleted,
  -- member_added, member_removed, comment_added, etc.)
  action      TEXT NOT NULL,

  -- Which entity type was affected (task, project, member, comment)
  entity_type TEXT NOT NULL,

  -- The ID of the affected entity
  entity_id   TEXT NOT NULL,

  -- Human-readable summary, e.g. "Changed status from To Do to In Progress"
  description TEXT NOT NULL,

  -- Optional: store old/new values for detailed diff
  -- e.g. { "field": "status", "old": "todo", "new": "in_progress" }
  metadata    JSONB DEFAULT '{}',

  -- Optional: scope to a project for filtering
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by project
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Index for fast lookups by entity
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Index for chronological queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security (optional — using service_role key bypasses RLS)
-- ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
