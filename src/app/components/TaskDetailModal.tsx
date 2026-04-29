import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AttachmentUpload } from './AttachmentUpload';
import { AttachmentList } from './AttachmentList';
import { useAttachments } from '../lib/useAttachments';

interface TaskDetailModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  taskTitle?: string;
  currentUserId?: string;
  userRole?: string;
}

/**
 * TaskDetailModal - Modal for viewing task details with attachments
 * Demonstrates how to integrate AttachmentUpload and AttachmentList
 * components into a task detail view
 */
export function TaskDetailModal({
  taskId,
  isOpen,
  onClose,
  taskTitle = 'Task Details',
  currentUserId,
  userRole,
}: TaskDetailModalProps) {
  const { attachments, loading, refetch } = useAttachments({
    taskId,
    autoFetch: isOpen,
  });
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void refetch();
    }
  }, [isOpen, taskId, refetch]);

  if (!isOpen) return null;

  const handleUploadSuccess = async (newAttachment: any) => {
    setUploadError(null);
    await refetch();
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">{taskTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Attachments Section */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Attachments
            </h3>

            {/* Upload Form */}
            <div className="mb-4">
              <AttachmentUpload
                taskId={taskId}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

            {/* Attachment List */}
            <AttachmentList
              taskId={taskId}
              attachments={attachments}
              isLoading={loading}
              currentUserId={currentUserId}
              userRole={userRole}
              onAttachmentsChange={refetch}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-hover hover:bg-surface-sunken rounded-lg text-text-primary transition-colors"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
