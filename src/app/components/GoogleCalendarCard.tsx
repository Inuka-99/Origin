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
    <div className="bg-surface rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-4 mb-6">
        <CalendarIcon className="w-6 h-6 text-accent" />
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
          >
            Google Calendar Integration
          </h2>
          <p className="text-sm text-text-secondary">Sync task due dates to your Google Calendar.</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading integration status…
        </div>
      )}

      {!loading && status && !status.connected && (
        <button
          onClick={handleConnect}
          disabled={busy}
          className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium disabled:opacity-50"
        >
          {busy ? 'Opening Google…' : 'Connect Google Calendar'}
        </button>
      )}

      {!loading && status?.connected && (
        <div className="space-y-4">
          {status.needsReconnect && (
            <div className="flex items-start gap-2 p-3 bg-status-warning-soft border border-status-warning rounded-lg text-sm text-status-warning">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              Google refused the stored credentials. Please reconnect.
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
            <Check className="w-4 h-4 text-status-success" />
            <span>Connected as</span>
            <span className="font-medium">
              {status.googleEmail && !status.googleEmail.endsWith('@google')
                ? status.googleEmail
                : 'your Google account'}
            </span>
            <span className="text-xs text-text-tertiary">
              ({status.source === 'auth0_federated' ? 'via Auth0 Google login' : 'standalone OAuth'})
            </span>
          </div>
          {(() => {
            const emailMissing = !!status.googleEmail && status.googleEmail.endsWith('@google');
            const calendarsEmpty = calendars.length === 0;
            // Both conditions are symptoms of a legacy grant with
            // narrow scopes. We collapse them into a single, more
            // useful prompt so the user only sees one explanation.
            if (!emailMissing && !calendarsEmpty) return null;
            const missingPieces: string[] = [];
            if (emailMissing)    missingPieces.push('display the connected email address');
            if (calendarsEmpty)  missingPieces.push('list your calendars for selection');
            return (
              <div className="flex items-start gap-2 text-xs text-status-warning bg-status-warning-soft border border-status-warning rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  This connection was made before we requested broader
                  permissions. Click <span className="font-medium">Disconnect</span>{' '}
                  and reconnect to {missingPieces.join(' and ')}. Existing task
                  sync keeps working in the meantime.
                </div>
              </div>
            );
          })()}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Target calendar</label>
            <select
              value={status.calendarId ?? 'primary'}
              onChange={(e) => handleChangeCalendar(e.target.value)}
              disabled={busy || calendars.length === 0}
              className="w-full px-4 py-2.5 bg-surface-sunken border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium disabled:opacity-50"
            >
              Sync all existing tasks
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="px-4 py-2 bg-surface-hover text-text-secondary rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.kind === 'error' ? 'text-status-danger' : 'text-text-secondary'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
