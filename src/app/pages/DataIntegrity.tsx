import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Database,
  ListChecks,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useApiClient } from '../lib/api-client';

type IntegrityStatus = 'healthy' | 'warning' | 'critical';
type CheckStatus = 'ok' | 'warning' | 'critical';

interface IntegrityCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  severity: 'warning' | 'critical';
  inspectedCount: number;
  issueCount: number;
  details: string[];
  action: string;
}

interface IntegritySnapshot {
  id: string;
  status: IntegrityStatus;
  score: number;
  table_counts: Record<string, number>;
  issue_counts: Record<string, number>;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface IntegrityReport {
  status: IntegrityStatus;
  score: number;
  checkedAt: string;
  totals: {
    projects: number;
    tasks: number;
    users: number;
    projectMembers: number;
    taskAssignments: number;
    activityLogs: number;
    integrationMappings: number;
  };
  issueCounts: Record<string, number>;
  checks: IntegrityCheck[];
  latestSnapshot: IntegritySnapshot | null;
}

const statusStyles: Record<IntegrityStatus, { label: string; badge: string; icon: string; ring: string }> = {
  healthy: {
    label: 'Healthy',
    badge: 'bg-green-100 text-green-700',
    icon: 'bg-green-100 text-green-600',
    ring: 'ring-green-100',
  },
  warning: {
    label: 'Needs Review',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'bg-amber-100 text-amber-600',
    ring: 'ring-amber-100',
  },
  critical: {
    label: 'Critical',
    badge: 'bg-red-100 text-red-700',
    icon: 'bg-red-100 text-red-600',
    ring: 'ring-red-100',
  },
};

const checkStyles: Record<CheckStatus, { badge: string; icon: typeof CheckCircle2; iconClass: string }> = {
  ok: {
    badge: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
    iconClass: 'text-green-600',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  critical: {
    badge: 'bg-red-100 text-red-700',
    icon: AlertTriangle,
    iconClass: 'text-red-600',
  },
};

const totalLabels: Record<keyof IntegrityReport['totals'], string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  users: 'Users',
  projectMembers: 'Members',
  taskAssignments: 'Assignments',
  activityLogs: 'Activity Logs',
  integrationMappings: 'Sync Mappings',
};

function formatDate(value?: string | null) {
  if (!value) return 'No checkpoint yet';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusFromSnapshot(snapshot: IntegritySnapshot): IntegrityStatus {
  return snapshot.status;
}

export function DataIntegrity() {
  const api = useApiClient();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [snapshots, setSnapshots] = useState<IntegritySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkpointing, setCheckpointing] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const issueTotal = useMemo(
    () => report?.checks.reduce((sum, check) => sum + check.issueCount, 0) ?? 0,
    [report],
  );

  const loadIntegrity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextReport, nextSnapshots] = await Promise.all([
        api.get<IntegrityReport>('/data-integrity/report'),
        api.get<IntegritySnapshot[]>('/data-integrity/snapshots?limit=5'),
      ]);
      setReport(nextReport);
      setSnapshots(nextSnapshots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data integrity status');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadIntegrity();
  }, [loadIntegrity]);

  const createCheckpoint = async () => {
    setCheckpointing(true);
    setMessage(null);
    setError(null);
    try {
      const snapshot = await api.post<IntegritySnapshot>('/data-integrity/snapshots', {
        notes,
      });
      setSnapshots((current) => [snapshot, ...current].slice(0, 5));
      setNotes('');
      setMessage('Integrity checkpoint saved.');
      await loadIntegrity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkpoint');
    } finally {
      setCheckpointing(false);
    }
  };

  const currentStatus = report?.status ?? 'healthy';
  const currentStatusStyle = statusStyles[currentStatus];

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Sidebar />
      <TopBar />

      <main className="ml-56 pt-16">
        <div className="p-8">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#204EA7] rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-3xl font-semibold text-gray-900"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Data Integrity
                </h1>
                <p className="text-sm text-gray-500">
                  Prevent data loss and keep the database state consistent.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadIntegrity}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-6 mb-6">
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${currentStatusStyle.icon}`}>
                      {currentStatus === 'healthy' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${currentStatusStyle.badge}`}>
                        {currentStatusStyle.label}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        Last checked {report ? formatDate(report.checkedAt) : 'loading'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 max-w-2xl">
                    {issueTotal === 0
                      ? 'All monitored references and consistency rules are passing.'
                      : `${issueTotal} integrity issue${issueTotal === 1 ? '' : 's'} found across monitored records.`}
                  </p>
                </div>

                <div className={`w-28 h-28 rounded-full ring-8 ${currentStatusStyle.ring} flex flex-col items-center justify-center`}>
                  <span
                    className="text-3xl font-semibold text-gray-900"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {report?.score ?? '--'}
                  </span>
                  <span className="text-xs text-gray-500">Score</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {report
                  ? (Object.entries(report.totals) as [keyof IntegrityReport['totals'], number][]).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs text-gray-500 mb-1">{totalLabels[key]}</p>
                        <p
                          className="text-xl font-semibold text-gray-900"
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {value}
                        </p>
                      </div>
                    ))
                  : Array.from({ length: 8 }, (_, index) => (
                      <div key={index} className="h-[70px] rounded-lg bg-gray-100 animate-pulse" />
                    ))}
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Camera className="w-5 h-5 text-[#204EA7]" />
                <h2
                  className="text-lg font-semibold text-gray-900"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Checkpoint
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Latest saved checkpoint: {formatDate(report?.latestSnapshot?.created_at)}
              </p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional checkpoint notes"
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#204EA7]/20 focus:border-[#204EA7]"
              />
              <button
                onClick={createCheckpoint}
                disabled={checkpointing || loading || !report}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#204EA7] text-white text-sm font-medium hover:bg-[#1a3d8a] disabled:opacity-50 transition-colors"
              >
                {checkpointing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Save Checkpoint
              </button>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
            <section className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListChecks className="w-5 h-5 text-[#204EA7]" />
                  <h2
                    className="text-lg font-semibold text-gray-900"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Integrity Checks
                  </h2>
                </div>
                <span className="text-xs text-gray-500">{report?.checks.length ?? 0} checks</span>
              </div>

              {loading && (
                <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading checks...
                </div>
              )}

              {!loading && report?.checks.map((check) => {
                const style = checkStyles[check.status];
                const Icon = style.icon;
                return (
                  <div key={check.id} className="px-6 py-5 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-start gap-4">
                      <Icon className={`w-5 h-5 mt-0.5 ${style.iconClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">{check.label}</h3>
                            <p className="text-sm text-gray-500 mt-1">{check.description}</p>
                          </div>
                          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${style.badge}`}>
                            {check.issueCount === 0 ? 'OK' : `${check.issueCount} issue${check.issueCount === 1 ? '' : 's'}`}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                          <span>{check.inspectedCount} inspected</span>
                          <span>{check.severity === 'critical' ? 'Critical' : 'Warning'} rule</span>
                        </div>

                        {check.details.length > 0 && (
                          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
                            <ul className="space-y-2">
                              {check.details.map((detail) => (
                                <li key={detail} className="text-xs text-gray-600">
                                  {detail}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-xs font-medium text-gray-700">{check.action}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            <aside className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#204EA7]" />
                <h2
                  className="text-lg font-semibold text-gray-900"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Recent Checkpoints
                </h2>
              </div>

              {snapshots.length === 0 && !loading && (
                <div className="p-6 text-center">
                  <Database className="w-9 h-9 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">No checkpoints saved</p>
                  <p className="text-xs text-gray-500 mt-1">Saved checkpoints will appear here.</p>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {snapshots.map((snapshot) => {
                  const snapshotStyle = statusStyles[getStatusFromSnapshot(snapshot)];
                  return (
                    <div key={snapshot.id} className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${snapshotStyle.badge}`}>
                          {snapshotStyle.label}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{snapshot.score}</span>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(snapshot.created_at)}</p>
                      {snapshot.notes && (
                        <p className="text-sm text-gray-600 mt-3 line-clamp-3">{snapshot.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
