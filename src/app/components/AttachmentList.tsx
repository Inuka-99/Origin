import React, { useState, useEffect } from 'react';
import { Download, Trash2, FileIcon, Loader } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { getAuth0Config } from '../auth/auth.interfaces';

interface Attachment {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: string;
}

interface AttachmentListProps {
  taskId: string;
  attachments?: Attachment[];
  onAttachmentsChange?: (attachments: Attachment[]) => void;
  isLoading?: boolean;
  currentUserId?: string;
  userRole?: string;
}

/**
 * AttachmentList - Display and manage task attachments
 * Shows file list with download and delete options
 */
export function AttachmentList({
  taskId,
  attachments = [],
  onAttachmentsChange,
  isLoading = false,
  currentUserId,
  userRole,
}: AttachmentListProps) {
  const { getAccessTokenSilently } = useAuth0();
  const { apiUrl, audience } = getAuth0Config();
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>(attachments);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalAttachments(attachments);
  }, [attachments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getFileIcon = (mimeType: string): React.ReactNode => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    }
    if (mimeType.includes('pdf')) {
      return '📄';
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝';
    }
    if (mimeType.includes('sheet') || mimeType.includes('spreadsheet')) {
      return '📊';
    }
    if (mimeType.startsWith('video/')) {
      return '🎥';
    }
    if (mimeType.startsWith('audio/')) {
      return '🎵';
    }
    return '📎';
  };

  const handleDownload = async (attachment: Attachment) => {
    setDownloading((prev) => new Set(prev).add(attachment.id));

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience },
      });

      const response = await fetch(`${apiUrl}/tasks/attachments/${attachment.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const { url } = await response.json();
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(attachment.id);
        return next;
      });
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return;

    setDeleting((prev) => new Set(prev).add(attachmentId));

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience },
      });

      const response = await fetch(`${apiUrl}/tasks/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      const updated = localAttachments.filter((a) => a.id !== attachmentId);
      setLocalAttachments(updated);
      onAttachmentsChange?.(updated);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete attachment');
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(attachmentId);
        return next;
      });
    }
  };

  const canDelete = (attachment: Attachment): boolean => {
    if (userRole === 'admin') return true;
    if (currentUserId && attachment.uploaded_by === currentUserId) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (localAttachments.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        <FileIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No attachments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {localAttachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-3 p-3 bg-surface-sunken rounded-lg hover:bg-surface-hover transition-colors"
        >
          <span className="text-xl flex-shrink-0">
            {getFileIcon(attachment.mime_type)}
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {attachment.filename}
            </p>
            <p className="text-xs text-text-secondary">
              {formatFileSize(attachment.size_bytes)} • {formatDate(attachment.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleDownload(attachment)}
              disabled={downloading.has(attachment.id)}
              className="p-2 hover:bg-surface rounded-lg transition-colors text-text-secondary hover:text-accent disabled:opacity-50"
              title="Download"
              type="button"
            >
              {downloading.has(attachment.id) ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>

            {canDelete(attachment) && (
              <button
                onClick={() => handleDelete(attachment.id)}
                disabled={deleting.has(attachment.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-text-secondary hover:text-red-600 disabled:opacity-50"
                title="Delete"
                type="button"
              >
                {deleting.has(attachment.id) ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
