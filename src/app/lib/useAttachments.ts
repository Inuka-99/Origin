import { useState, useCallback, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getAuth0Config } from '../auth/auth.interfaces';

export interface TaskAttachment {
  id: string;
  task_id: string;
  activity_log_id: string | null;
  uploaded_by: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  deleted_at: string | null;
}

interface UseAttachmentsOptions {
  taskId?: string;
  autoFetch?: boolean;
}

interface UseAttachmentsReturn {
  attachments: TaskAttachment[];
  loading: boolean;
  error: string | null;
  fetchAttachments: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage task attachments
 */
export function useAttachments({
  taskId,
  autoFetch = true,
}: UseAttachmentsOptions = {}): UseAttachmentsReturn {
  const { getAccessTokenSilently } = useAuth0();
  const { apiUrl, audience } = getAuth0Config();
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience },
      });

      const response = await fetch(`${apiUrl}/tasks/${taskId}/attachments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch attachments: ${response.statusText}`);
      }

      const data = await response.json();
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch attachments';
      setError(message);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, getAccessTokenSilently, apiUrl, audience]);

  useEffect(() => {
    if (autoFetch) {
      void fetchAttachments();
    }
  }, [fetchAttachments, autoFetch]);

  return {
    attachments,
    loading,
    error,
    fetchAttachments,
    refetch: fetchAttachments,
  };
}
