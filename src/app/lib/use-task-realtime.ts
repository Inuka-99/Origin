import { useEffect } from 'react';
import { supabaseClient } from './supabase-client';

export interface TaskRealtimePayload {
  id: string;
  [key: string]: unknown;
}

interface UseTaskRealtimeOptions {
  onCreated?: (task: TaskRealtimePayload) => void;
  onUpdated?: (task: TaskRealtimePayload) => void;
  onDeleted?: (payload: { id: string }) => void;
}

export function useTaskRealtime({
  onCreated,
  onUpdated,
  onDeleted,
}: UseTaskRealtimeOptions) {
  useEffect(() => {
    const channel = supabaseClient.channel('tasks');

    channel.on('broadcast', { event: 'task:created' }, (event) => {
      if (onCreated) {
        onCreated(event.payload as TaskRealtimePayload);
      }
    });

    channel.on('broadcast', { event: 'task:updated' }, (event) => {
      if (onUpdated) {
        onUpdated(event.payload as TaskRealtimePayload);
      }
    });

    channel.on('broadcast', { event: 'task:deleted' }, (event) => {
      if (onDeleted) {
        onDeleted(event.payload as { id: string });
      }
    });

    void channel.subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [onCreated, onUpdated, onDeleted]);
}
