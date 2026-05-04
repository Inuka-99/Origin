-- ============================================================
-- Task Assignments table for Origin Task Manager
--
-- Tracks which users are assigned to which tasks. Separate from
-- the `assigned_to` field on tasks to support multiple assignees
-- per task in future iterations.
-- ============================================================

CREATE TABLE IF NOT EXISTS task_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign keys
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Metadata
  assigned_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  assigned_by     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Ensure no duplicate assignments
  UNIQUE(task_id, user_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id 
  ON task_assignments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id 
  ON task_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_at 
  ON task_assignments(assigned_at DESC);

-- Enable Row Level Security (bypassed by service_role key, but good practice)
-- ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
