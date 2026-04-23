/**
 * GoogleCalendarCard.tsx
 *
 * Settings card for the Google Calendar integration. Three states:
 *   1. Not connected       → "Connect Google Calendar" button.
 *   2. Connected           → shows email, calendar selector, disconnect,
 *                            "Sync all existing tasks" button.
 *   3. Needs reconnect     → warning + reconnect button (invalid_grant).
 */

import { useCallback, useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useApiClient } from '../lib/api-client';

interface ConnectionStatus {
  connected: boolean;
  source?: 'auth0_federated' | 'standalone_oauth';
  googleEmail?: string;
  calendarId?: string;
  needsReconnect?: boolean;
}

interface CalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

interface BackfillResult {
  inspected: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export function GoogleCalendarCard() {
  const api = useApiClient();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [calendars, setCalendars] = useState<CalendarListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.get<ConnectionStatus>('/api/integrations/google/status');
      setStatus(s);
      if (s.connected) {
        const list = await api.get<CalendarListItem[]>('/api/integrations/google/calendars');
        setCalendars(list);
      } else {
        setCalendars([]);
      }
    } catch (err) {
      setMessage({ kind: 'error', text: `Failed to load status: ${(err as Error).message}` });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // When the OAuth callback redirects back to this page with ?google=connected|error,
  // pick that up and refresh status.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g === 'connected') {
      setMessage({ kind: 'info', text: 'Google Calendar connected!' });
      window.history.replaceState({}, '', window.location.pathname);
      void loadStatus();
    } else if (g === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      setMessage({ kind: 'error', text: `Connection failed: ${reason}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadStatus]);

  const handleConnect = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { url } = await api.post<{ url: string }>('/api/integrations/google/oauth/start');
      window.location.href = url;
    } catch (err) {
      setBusy(false);
      setMessage({ kind: 'error', text: `Could not start OAuth: ${(err as Error).message}` });
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Calendar? Synced task events will stop updating.')) return;
    setBusy(true);
    try {
      await api.delete('/api/integrations/google/disconnect');
      setMessage({ kind: 'info', text: 'Google Calendar disconnected.' });
      await loadStatus();
    } catch (err) {
      setMessage({ kind: 'error', text: `Disconnect failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const handleChangeCalendar = async (calendarId: string) => {
    setBusy(true);
    try {
      await api.patch('/api/integrations/google/settings', { calendarId });
      setStatus((s) => (s ? { ...s, calendarId } : s));
      setMessage({ kind: 'info', text: `Target calendar updated.` });
    } catch (err) {
      setMessage({ kind: 'error', text: `Update failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const handleBackfill = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await api.post<BackfillResult>('/api/integrations/google/sync/backfill');
      setMessage({
        kind: 'info',
        text: `Backfill: inspected ${r.inspected}, created ${r.created}, updated ${r.updated}, skipped ${r.skipped}, failed ${r.failed}.`,
      });
    } catch (err) {
      setMessage({ kind: 'error', text: `Backfill failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4 mb-6">
        <CalendarIcon className="w-6 h-6 text-[#204EA7]" />
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1a1a1a' }}
          >
            Google Calendar Integration
          </h2>
          <p className="text-sm text-gray-600">Sync task due dates to your Google Calendar.</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading integration status…
        </div>
      )}

      {!loading && status && !status.connected && (
        <button
          onClick={handleConnect}
          disabled={busy}
          className="px-6 py-2.5 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors font-medium disabled:opacity-50"
        >
          {busy ? 'Opening Google…' : 'Connect Google Calendar'}
        </button>
      )}

      {!loading && status?.connected && (
        <div className="space-y-4">
          {status.needsReconnect && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              Google refused the stored credentials. Please reconnect.
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-green-600" />
            Connected as <span className="font-medium">{status.googleEmail}</span>
            <span className="text-xs text-gray-500">
              ({status.source === 'auth0_federated' ? 'via Auth0 Google login' : 'standalone OAuth'})
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target calendar</label>
            <select
              value={status.calendarId ?? 'primary'}
              onChange={(e) => handleChangeCalendar(e.target.value)}
              disabled={busy || calendars.length === 0}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]"
            >
              {calendars.length === 0 && <option value={status.calendarId ?? 'primary'}>primary</option>}
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.summary}
                  {c.primary ? ' (primary)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBackfill}
              disabled={busy}
              className="px-4 py-2 bg-[#204EA7] text-white rounded-lg hover:bg-[#1a3d8a] transition-colors text-sm font-medium disabled:opacity-50"
            >
              Sync all existing tasks
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.kind === 'error' ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
