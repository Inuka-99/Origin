-- ============================================================
-- Project Members table for Origin Task Manager
--
-- Links users to projects with role-based access control (RBAC).
-- Each user's access level to a project is defined by their role.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Foreign keys
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Role for RBAC
  role            TEXT NOT NULL CHECK (role IN (
                    'Admin', 'Project Manager', 'Team Lead',
                    'Developer', 'Designer', 'Tester'
                  )),
  
  -- Metadata
  joined_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Ensure no duplicate memberships
  UNIQUE(project_id, user_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_project_members_project_id 
  ON project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_user_id 
  ON project_members(user_id);

CREATE INDEX IF NOT EXISTS idx_project_members_joined_at 
  ON project_members(joined_at DESC);

-- Composite index for finding user's role in a specific project
CREATE INDEX IF NOT EXISTS idx_project_members_project_user 
  ON project_members(project_id, user_id);

-- Enable Row Level Security (bypassed by service_role key, but good practice)
-- ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
