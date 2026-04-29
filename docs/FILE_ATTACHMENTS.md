# Task File Attachments Feature

This document describes the implementation of file attachments for tasks in Origin.

## Overview

The attachment system allows users to:
- Upload files to tasks
- Attach files to comments/activity logs
- Download attachments
- Delete attachments (with role-based permissions)
- View attachment metadata (size, upload date, uploader)

Files are stored in Supabase Storage (bucket: `task-attachments`) and metadata is tracked in a PostgreSQL database table.

## Database Schema

### `task_attachments` Table

```sql
CREATE TABLE task_attachments (
  id                UUID PRIMARY KEY,
  task_id           UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  activity_log_id   UUID REFERENCES activity_logs(id) ON DELETE CASCADE,
  uploaded_by       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL UNIQUE,
  filename          TEXT NOT NULL,
  mime_type         TEXT NOT NULL,
  size_bytes        INTEGER NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ  -- Soft delete support
);
```

Indexes are created for:
- `task_id` (common query)
- `activity_log_id` (activity-specific attachments)
- `uploaded_by` (user's uploads)
- `created_at DESC` (chronological ordering)
- Partial index on `(task_id) WHERE deleted_at IS NULL` (active attachments)

## Backend Implementation

### Services

#### `AttachmentsService` (`server/src/tasks/attachments.service.ts`)

Core service for attachment operations:

```typescript
// Upload a file to a task
async uploadAttachment(
  file: Express.Multer.File,
  taskId: string,
  userId: string,
  activityLogId?: string
): Promise<TaskAttachment>

// Get all attachments for a task
async getTaskAttachments(taskId: string): Promise<TaskAttachment[]>

// Get attachments for a specific activity log
async getActivityAttachments(activityLogId: string): Promise<TaskAttachment[]>

// Get signed download URL (1-hour expiry by default)
async getDownloadUrl(attachmentId: string, expiresIn?: number): Promise<string>

// Soft delete (mark deleted_at)
async deleteAttachment(
  attachmentId: string,
  userId: string,
  userRole: string
): Promise<void>

// Hard delete (remove from storage and DB)
async hardDeleteAttachment(attachmentId: string): Promise<void>
```

### API Endpoints

All endpoints require JWT authentication (`JwtAuthGuard`).

#### Upload Attachment
```
POST /api/tasks/:id/attachments
Content-Type: multipart/form-data

Query Parameters:
  - activityLogId (optional): UUID of activity log to attach to

Response:
{
  "id": "uuid",
  "task_id": "uuid",
  "filename": "document.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 1024000,
  "created_at": "2025-04-28T10:00:00Z",
  "uploaded_by": "user-id"
}
```

#### List Task Attachments
```
GET /api/tasks/:id/attachments

Response:
[
  {
    "id": "uuid",
    "filename": "image.png",
    "mime_type": "image/png",
    "size_bytes": 512000,
    ...
  },
  ...
]
```

#### Get Download URL
```
GET /api/tasks/attachments/:id/download?expiresIn=7200

Query Parameters:
  - expiresIn (optional): Expiry time in seconds (default: 3600)

Response:
{
  "url": "https://supabase.../object/sign/task-attachments/..."
}
```

#### Delete Attachment
```
DELETE /api/tasks/attachments/:id

Response:
{
  "deleted": true
}
```

**Permission Rules:**
- Only admins or the file uploader can delete
- Admins can delete any file
- Regular users can only delete their own uploads

## Frontend Implementation

### Components

#### `AttachmentUpload` Component
Upload component with drag-and-drop support.

```typescript
import { AttachmentUpload } from '../components/AttachmentUpload';

<AttachmentUpload
  taskId="task-uuid"
  onUploadSuccess={(attachment) => console.log('Uploaded:', attachment)}
  onUploadError={(error) => console.error(error)}
  activityLogId="optional-activity-uuid"
  disabled={false}
/>
```

**Props:**
- `taskId` (required): UUID of the task
- `onUploadSuccess`: Callback when upload completes
- `onUploadError`: Callback for errors
- `activityLogId`: Optional activity log UUID
- `disabled`: Disable uploads

**Features:**
- Drag-and-drop file upload
- Loading state with spinner
- Error messages with clear feedback
- Supports any file type and size

#### `AttachmentList` Component
Display list of attachments with download/delete actions.

```typescript
import { AttachmentList } from '../components/AttachmentList';

<AttachmentList
  taskId="task-uuid"
  attachments={attachments}
  isLoading={false}
  currentUserId="user-id"
  userRole="admin"
  onAttachmentsChange={(updated) => setAttachments(updated)}
/>
```

**Props:**
- `taskId` (required): UUID of the task
- `attachments`: Array of attachment objects
- `isLoading`: Show loading state
- `currentUserId`: Current user's ID
- `userRole`: User's role (for delete permissions)
- `onAttachmentsChange`: Callback when list changes

**Features:**
- File type icons (PDF, documents, images, etc.)
- File size formatting
- Formatted upload dates
- Download button (generates signed URL)
- Delete button (with confirmation, role-aware)

#### `TaskDetailModal` Component
Complete modal example showing attachments integration.

```typescript
import { TaskDetailModal } from '../components/TaskDetailModal';

<TaskDetailModal
  taskId="task-uuid"
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  taskTitle="Task Name"
  currentUserId={userId}
  userRole={userRole}
/>
```

### Custom Hook

#### `useAttachments` Hook
Fetch and manage attachments for a task.

```typescript
import { useAttachments } from '../lib/useAttachments';

const { attachments, loading, error, refetch } = useAttachments({
  taskId: 'task-uuid',
  autoFetch: true  // Fetch on mount
});
```

**Returns:**
- `attachments`: Array of attachment objects
- `loading`: Boolean loading state
- `error`: Error message if fetch fails
- `fetchAttachments`: Manual fetch function
- `refetch`: Alias for fetchAttachments

## Usage Examples

### Example 1: Basic Attachments in Task Modal

```typescript
import { useState } from 'react';
import { AttachmentUpload } from '../components/AttachmentUpload';
import { AttachmentList } from '../components/AttachmentList';
import { useAttachments } from '../lib/useAttachments';

function TaskModal({ taskId, isOpen, onClose }) {
  const { attachments, loading, refetch } = useAttachments({ taskId, autoFetch: isOpen });

  return (
    <div className="modal">
      <h2>Task Details</h2>
      
      <section>
        <h3>Attachments</h3>
        <AttachmentUpload
          taskId={taskId}
          onUploadSuccess={() => refetch()}
        />
        <AttachmentList
          taskId={taskId}
          attachments={attachments}
          isLoading={loading}
        />
      </section>

      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Example 2: Activity Log Attachments

```typescript
// Upload file attached to a comment
<AttachmentUpload
  taskId={taskId}
  activityLogId={commentId}
  onUploadSuccess={() => refetchComments()}
/>
```

### Example 3: Conditional Download Link

```typescript
const { attachments } = useAttachments({ taskId });

{attachments.map(att => (
  <a 
    key={att.id}
    href={`/api/tasks/attachments/${att.id}/download`}
    download={att.filename}
  >
    Download {att.filename}
  </a>
))}
```

## File Storage

### Supabase Storage Setup

Files are stored in the `task-attachments` bucket with the following structure:

```
task-attachments/
├── {taskId}/
│   ├── {fileId}
│   ├── {fileId}
│   └── ...
└── ...
```

### Path Structure
- **Bucket**: `task-attachments`
- **Path Pattern**: `{taskId}/{fileId}`
- **File ID Format**: `{timestamp}-{random}`

### Signed URLs

Download URLs are generated with the `createSignedUrl` method:
- Default expiry: 1 hour (3600 seconds)
- Configurable via `expiresIn` query parameter
- URLs are single-use for security

## Security Considerations

### Permission Model
1. **Upload**: Any authenticated user can upload
2. **Download**: Any authenticated user can download (needs valid signed URL)
3. **Delete**: 
   - Admins can delete any attachment
   - Regular users can only delete their own uploads

### Data Validation
- File buffer validation (non-empty)
- MIME type capture (user-provided, not validated server-side)
- File size tracking (no hard limits)
- Task/activity existence verification

### Storage Security
- Files stored in Supabase Storage (encrypted at rest)
- Signed URLs for time-limited access
- Soft deletes preserve audit trail
- Hard deletes remove file from storage

## Error Handling

### Common Error Scenarios

#### Upload Errors
```typescript
{
  statusCode: 400,
  message: "No file provided",
  error: "BadRequestException"
}

{
  statusCode: 404,
  message: "Task not found",
  error: "NotFoundException"
}

{
  statusCode: 400,
  message: "Failed to upload file to storage",
  error: "BadRequestException"
}
```

#### Permission Errors
```typescript
{
  statusCode: 403,
  message: "Not authorized to delete this attachment",
  error: "ForbiddenException"
}
```

### Frontend Error Handling
The AttachmentUpload component provides error callbacks:

```typescript
<AttachmentUpload
  taskId={taskId}
  onUploadError={(error) => {
    setErrorMessage(error);  // "Upload failed: ..."
    // User-friendly error display
  }}
/>
```

## Future Enhancements

Potential improvements for future iterations:

1. **Image Preview**: Inline image preview for image attachments
2. **Batch Upload**: Multiple file selection and upload
3. **File Size Limits**: Configurable per-instance limits
4. **Virus Scanning**: Integrate with malware scanning service
5. **CDN Integration**: Serve frequently accessed files via CDN
6. **Retention Policies**: Auto-delete old attachments
7. **File Comments**: Comment on specific attachments
8. **Version Control**: Track attachment versions/history
9. **Collaborative Editing**: External tool integrations (Figma, etc.)
10. **Analytics**: Track attachment downloads and usage

## Database Migration

To set up attachments on an existing instance, run:

```bash
# Run the migration
psql postgresql://user:password@host/database < supabase/migrations/create_task_attachments.sql

# Or via Supabase CLI
supabase migration up
```

The migration creates:
- `task_attachments` table
- All necessary indexes
- Foreign key constraints with ON DELETE CASCADE

## Testing

### Manual Testing Checklist

- [ ] Upload a single file
- [ ] Download uploaded file
- [ ] Delete own upload (as regular user)
- [ ] Verify permission error when deleting others' uploads
- [ ] Delete as admin
- [ ] Drag and drop file upload
- [ ] Upload file with special characters in name
- [ ] Verify error handling for non-existent task
- [ ] Verify error handling for network failures
- [ ] Test with various file types (PDF, images, documents)
- [ ] Test soft delete (verify deleted_at is set)
- [ ] Verify storage path generation
- [ ] Test signed URL expiry
- [ ] Test attachment list pagination (future)

## Support

For issues or questions about the attachment system:
1. Check error messages in browser console
2. Verify Supabase Storage bucket exists
3. Check database migration was run
4. Verify JWT token is valid
5. Check user has correct permissions
