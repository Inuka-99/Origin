import React, { useRef, useState } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { getAuth0Config } from '../auth/auth.interfaces';

interface AttachmentUploadProps {
  taskId: string;
  onUploadSuccess?: (attachment: any) => void;
  onUploadError?: (error: string) => void;
  activityLogId?: string;
  disabled?: boolean;
}

/**
 * AttachmentUpload - File upload component for task attachments
 * Handles single file uploads to task attachments endpoint
 */
export function AttachmentUpload({
  taskId,
  onUploadSuccess,
  onUploadError,
  activityLogId,
  disabled = false,
}: AttachmentUploadProps) {
  const { getAccessTokenSilently } = useAuth0();
  const { apiUrl, audience } = getAuth0Config();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience },
      });

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = activityLogId
        ? `${apiUrl}/tasks/${taskId}/attachments?activityLogId=${activityLogId}`
        : `${apiUrl}/tasks/${taskId}/attachments`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Upload failed: ${response.statusText}`
        );
      }

      const attachment = await response.json();
      onUploadSuccess?.(attachment);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      onUploadError?.(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer?.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive
            ? 'border-accent bg-accent-soft'
            : 'border-border-subtle hover:border-accent'
        } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="hidden"
          aria-label="Upload attachment"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full"
          type="button"
        >
          {isUploading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm text-text-secondary">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-5 h-5 text-text-secondary mx-auto" />
              <div className="text-sm">
                <p className="font-medium text-text-primary">
                  Click to upload or drag and drop
                </p>
                <p className="text-text-secondary text-xs mt-1">
                  Any file type supported
                </p>
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
