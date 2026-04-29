-- ============================================================
-- Task Attachments table for Origin Task Manager
-- Stores metadata for files attached to tasks and comments
-- Files are stored in Supabase Storage bucket 'task-attachments'
-- ============================================================

CREATE TABLE IF NOT EXISTS task_attachments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Task this attachment belongs to
  task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Optional: if attachment is on a comment/activity, reference it
  activity_log_id   UUID REFERENCES activity_logs(id) ON DELETE CASCADE,

  -- Who uploaded this file
  uploaded_by       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Supabase Storage path: task-attachments/{task_id}/{file_id}
  storage_path      TEXT NOT NULL UNIQUE,

  -- Original filename provided by user
  filename          TEXT NOT NULL,

  -- MIME type (e.g., 'application/pdf', 'image/png')
  mime_type         TEXT NOT NULL,

  -- File size in bytes
  size_bytes        INTEGER NOT NULL,

  -- ISO 8601 timestamp
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- For soft deletes or archival if needed
  deleted_at        TIMESTAMPTZ
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id 
  ON task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_activity_log_id 
  ON task_attachments(activity_log_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by 
  ON task_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_task_attachments_created_at 
  ON task_attachments(created_at DESC);

-- Partial index for non-deleted attachments (common case)
CREATE INDEX IF NOT EXISTS idx_task_attachments_not_deleted 
  ON task_attachments(task_id) WHERE deleted_at IS NULL;

-- Enable Row Level Security (optional — using service_role key bypasses RLS)
-- ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
