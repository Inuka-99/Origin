-- ============================================================
-- Scalability indexes for Origin
--
-- These indexes back the hot query paths surfaced by the
-- application code. Each one is justified inline so future
-- maintainers know whether it can be dropped.
--
-- Re-runnable: every statement uses IF NOT EXISTS, so this
-- migration is safe to apply repeatedly.
-- ============================================================

-- ---------- tasks ------------------------------------------------
-- Lists are filtered by project and ordered by created_at desc
-- (see tasks.service.ts listByProject / listForUser).
CREATE INDEX IF NOT EXISTS idx_tasks_project_id_created_at
  ON tasks (project_id, created_at DESC);

-- Used by getById / update / delete (single-row lookups already
-- use the PK, so we only index the foreign key for cascading
-- queries and to support upcoming "tasks assigned to me" views).
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
  ON tasks (assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ---------- task_assignments ------------------------------------
-- attachTaskAssignees() does an `IN (taskIds)` lookup; without
-- this index the query is a sequential scan once the table grows.
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id
  ON task_assignments (task_id);

CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id
  ON task_assignments (user_id);

-- ---------- project_members -------------------------------------
-- Every authenticated request currently looks up
-- (project_id, user_id) for permission checks. A composite index
-- with user_id leading also speeds up listForUser, which filters
-- by user_id only.
CREATE INDEX IF NOT EXISTS idx_project_members_user_project
  ON project_members (user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id
  ON project_members (project_id);

-- ---------- projects --------------------------------------------
-- Lists are ordered by created_at desc.
CREATE INDEX IF NOT EXISTS idx_projects_created_at
  ON projects (created_at DESC);

-- ---------- profiles --------------------------------------------
-- resolveMemberId() and the member candidate search both filter
-- by lower(email). A functional index keeps that case-insensitive
-- lookup fast even at hundreds of thousands of rows.
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles (lower(email));

-- Member candidate search now filters by full_name / email at the
-- database level (see ProjectsService.searchMemberCandidates).
-- A trigram index keeps ILIKE '%query%' lookups O(log n) instead
-- of a sequential scan. pg_trgm ships with Supabase.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON profiles USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON profiles USING gin (email gin_trgm_ops);
