# Persistent Storage Setup: Supabase Database Guide

## Overview

Origin uses **Supabase** (PostgreSQL) for persistent storage of all project and task data. This document explains how to set up and use the database with the backend API.

## Architecture

### Database Tables

All data is stored in Supabase with the following core tables:

#### 1. **profiles** (Supabase Auth)
- User account information (managed by Auth0 federation)
- Extensions: `job_title`, `bio`, `role`

#### 2. **projects**
Stores project metadata and status.

```typescript
id: UUID
name: TEXT (required)
description: TEXT (nullable)
start_date: TIMESTAMPTZ (required)
due_date: TIMESTAMPTZ (nullable)
priority: 'Low' | 'Medium' | 'High' | 'Urgent'
status: 'Planning' | 'Active' | 'In Progress' | 'Review' | 'On Hold' | 'Completed' | 'Archived'
department: TEXT (required)
tags: TEXT[] (default: [])
created_by: TEXT (references profiles.id)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

#### 3. **project_members**
Links users to projects with role-based access control (RBAC).

```typescript
id: UUID
project_id: UUID (references projects.id)
user_id: TEXT (references profiles.id)
role: 'Admin' | 'Project Manager' | 'Team Lead' | 'Developer' | 'Designer' | 'Tester'
joined_at: TIMESTAMPTZ
UNIQUE(project_id, user_id)
```

#### 4. **tasks**
Stores individual task data.

```typescript
id: UUID
project_id: UUID (nullable, references projects.id)
title: TEXT (required)
description: TEXT (nullable)
status: 'todo' | 'in_progress' | 'In Review' | 'Done'
priority: 'low' | 'medium' | 'high'
due_date: TIMESTAMPTZ (nullable)
assigned_to: TEXT (nullable, references profiles.id)
created_by: TEXT (nullable, references profiles.id)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

#### 5. **task_assignments** (optional, for future multi-assignee support)
Tracks multiple assignees per task.

```typescript
id: UUID
task_id: UUID (references tasks.id)
user_id: TEXT (references profiles.id)
assigned_at: TIMESTAMPTZ
assigned_by: TEXT (nullable, references profiles.id)
UNIQUE(task_id, user_id)
```

#### 6. **activity_logs**
Audit trail for all changes (projects, tasks, members, etc.)

#### 7. **task_attachments**
File attachments for tasks stored in Supabase Storage.

#### 8. **chat_channels** & **chat_messages**
Real-time messaging infrastructure.

## Setup Steps

### Step 1: Supabase Project Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or use existing one
3. Note your credentials:
   - **Project URL** (from Settings → API)
   - **Service Role Key** (from Settings → API) — **KEEP SECRET**

### Step 2: Run Database Migrations

The following migrations create the core tables:

1. `create_projects.sql` — Creates the projects table
2. `create_project_members.sql` — Creates project membership table
3. `create_tasks.sql` — Creates tasks table
4. `create_task_assignments.sql` — Creates task assignments table (future use)

**To apply migrations in Supabase:**

#### Option A: Using Supabase Dashboard SQL Editor
1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy-paste the migration SQL from the `supabase/migrations/` directory
4. Execute each migration in order

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-id your-project-id

# Apply migrations (automatically applies all in supabase/migrations)
supabase db push
```

### Step 3: Configure Backend Environment

Create or update `.env` in the `server/` directory:

```env
# Supabase credentials (from Step 1)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Auth0 configuration
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.originapp.com
AUTH0_ISSUER_URL=https://your-tenant.us.auth0.com/

# Server configuration
PORT=3000
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Google Calendar (optional)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GCAL_TOKEN_ENC_KEY=...
GCAL_OAUTH_STATE_SECRET=...
```

### Step 4: Start the Backend

```bash
cd server

# Install dependencies
npm install

# Run development server (with auto-reload)
npm run dev

# Or build and start production server
npm run build
npm start
```

The API will be available at `http://localhost:3000`.

## API Usage Examples

### Creating a Project

```bash
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q2 Platform Redesign",
    "description": "Modernize the UI/UX",
    "start_date": "2024-04-01T00:00:00Z",
    "due_date": "2024-06-30T23:59:59Z",
    "priority": "High",
    "department": "Engineering",
    "tags": ["frontend", "urgent"]
  }'
```

### Creating a Task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "project-uuid-here",
    "title": "Implement dark mode",
    "description": "Add dark theme toggle",
    "status": "To Do",
    "priority": "Medium",
    "due_date": "2024-05-15T23:59:59Z",
    "assigned_to": "user-id-here"
  }'
```

### Listing User's Projects

```bash
curl -X GET "http://localhost:3000/projects?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Adding Project Member

```bash
curl -X POST http://localhost:3000/projects/project-uuid-here/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "role": "Developer"
  }'
```

## Service Layer Architecture

### ProjectsService
Located in `server/src/projects/projects.service.ts`

**Responsibilities:**
- CRUD operations for projects
- Project member management
- Activity logging for changes
- Pagination support
- Role-based access control

**Key Methods:**
- `create(dto, userId)` — Create a project (creator becomes admin)
- `listForUser(userId, role, page, limit)` — List projects (members see own, admins see all)
- `getById(id)` — Get project details
- `update(id, dto, userId, role)` — Update project (admin only)
- `delete(id, userId, role)` — Delete project (admin only)
- `addMember(projectId, dto, userId, role)` — Add team member
- `removeMember(projectId, userId, currentUserId, role)` — Remove team member

### TasksService
Located in `server/src/tasks/tasks.service.ts`

**Responsibilities:**
- CRUD operations for tasks
- Task assignment management
- Status normalization
- Real-time broadcasting of changes
- Attachment management

**Key Methods:**
- `create(dto, userId)` — Create a task
- `listForUser(userId, role)` — List tasks user can access
- `getById(id, userId, role)` — Get task details with authorization
- `update(id, dto, userId, role)` — Update task
- `delete(id, userId, role)` — Delete task
- `assignTask(id, assigneeId, userId, role)` — Assign/unassign task

### SupabaseService
Located in `server/src/supabase/supabase.service.ts`

Provides the Supabase admin client for all database operations. Uses the `SERVICE_ROLE_KEY` which bypasses Row Level Security (RLS) so the backend can act on behalf of any user.

## Security Considerations

### Row Level Security (RLS)
While RLS policies are commented out in migrations (since we use service_role key), they should be enabled in production:

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see projects they belong to"
  ON projects
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id
      AND user_id = auth.uid()
    )
  );
```

### Authorization
The backend implements authorization at the service layer:

1. **Project operations** require project admin or global admin role
2. **Task operations** check project membership
3. **Member operations** require project admin or global admin
4. **Activity logging** tracks all modifications

### Data Integrity
- Cascade deletes ensure orphaned data doesn't accumulate
- Unique constraints prevent duplicate project/task memberships
- NOT NULL constraints on critical fields
- Foreign key constraints maintain referential integrity

## Monitoring & Maintenance

### Activity Logs
All changes are logged in the `activity_logs` table:

```bash
curl -X GET "http://localhost:3000/activity-log?entity_type=project&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Data Integrity Checks
Admin endpoint for checking database health:

```bash
curl -X GET "http://localhost:3000/data-integrity/check" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Backups
Supabase provides automated daily backups. Access backups in:
Dashboard → Settings → Backups

## Troubleshooting

### Connection Issues
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. Check backend logs: `npm run dev` will show Supabase initialization
3. Test connectivity: `curl https://your-project.supabase.co/rest/v1/`

### Migration Errors
1. Check that tables don't already exist (migrations use `IF NOT EXISTS`)
2. Verify Auth0 profile table exists (created by Supabase Auth setup)
3. Review Supabase SQL Editor error messages

### No Data Appearing
1. Verify user is authenticated (check JWT token)
2. Confirm project membership if user is not admin
3. Check activity logs for errors: `activity_logs` table

## Next Steps

1. **Frontend Integration**: The client SDK can use REST API or Supabase client library
2. **Real-time Updates**: Use Supabase Realtime subscriptions for task/chat changes
3. **File Storage**: Upload attachments to Supabase Storage bucket `task-attachments`
4. **Custom Indexes**: Add more indexes based on your query patterns
5. **Row Level Security**: Implement RLS policies for production

## References

- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [NestJS + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
