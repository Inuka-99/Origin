-- ============================================================
-- Tasks table for Origin Task Manager
--
-- Stores individual tasks which belong to projects. Tasks have
-- their own lifecycle (status, priority, assignments) independent
-- of their project status.
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Task content
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  
  -- Status lifecycle
  status          TEXT NOT NULL CHECK (status IN (
                    'todo', 'in_progress', 'In Review', 'Done'
                  )),
  priority        TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Timeline
  due_date        TIMESTAMPTZ,
  
  -- Assignment
  assigned_to     TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Audit fields
  created_by      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_project_id 
  ON tasks(project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
  ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to 
  ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created_at 
  ON tasks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by 
  ON tasks(created_by);

-- Composite index for listing project tasks by status
CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
  ON tasks(project_id, status);

-- Enable Row Level Security (bypassed by service_role key, but good practice)
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
