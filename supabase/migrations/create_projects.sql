-- ============================================================
-- Projects table for Origin Task Manager
-- 
-- Stores all project data including metadata, status, and
-- priority information. Projects are the top-level container
-- for organizing tasks and team collaboration.
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Project metadata
  name            TEXT NOT NULL,
  description     TEXT,
  
  -- Timeline
  start_date      TIMESTAMPTZ NOT NULL,
  due_date        TIMESTAMPTZ,
  
  -- Categorization
  priority        TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status          TEXT NOT NULL CHECK (status IN (
                    'Planning', 'Active', 'In Progress', 'Review', 
                    'On Hold', 'Completed', 'Archived'
                  )),
  department      TEXT NOT NULL,
  
  -- Tags for organization (stored as array)
  tags            TEXT[] DEFAULT '{}',
  
  -- Audit fields
  created_by      TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_projects_created_by 
  ON projects(created_by);

CREATE INDEX IF NOT EXISTS idx_projects_status 
  ON projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_created_at 
  ON projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_department 
  ON projects(department);

CREATE INDEX IF NOT EXISTS idx_projects_priority 
  ON projects(priority);

-- Composite index for listing projects by department and status
CREATE INDEX IF NOT EXISTS idx_projects_department_status 
  ON projects(department, status);

-- Enable Row Level Security (bypassed by service_role key, but good practice)
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
