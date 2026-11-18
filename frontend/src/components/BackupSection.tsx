import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database, Download, Trash2, Upload, RefreshCw, Play, AlertTriangle, Clock,
} from 'lucide-react';
import {
  listBackups, createBackup, deleteBackup, downloadBackup,
  restoreFromExisting, restoreFromUpload, type BackupRow,
} from '../lib/adminBackups';
import type { SiteSettings } from '../lib/adminSettings';

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
const label = 'block text-sm font-medium text-navy-700 mb-1';

const kindBadge: Record<string, string> = {
  manual: 'bg-navy-100 text-navy-700',
  auto: 'bg-accent-100 text-accent-800',
  pre_restore: 'bg-amber-100 text-amber-800',
};

const statusBadge: Record<string, string> = {
  ready: 'bg-emerald-100 text-emerald-800',
  running: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-700',
};

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface Props {
  form: SiteSettings;
  set: (k: keyof SiteSettings, v: string) => void;
}

export default function BackupSection({ form, set }: Props) {
  const qc = useQueryClient();
  const { data: backups = [] } = useQuery({
    queryKey: ['admin-backups'],
    queryFn: listBackups,
    refetchInterval: 5_000, // poll so "running" moves to "ready"
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-backups'] });
      setMsg({ ok: true, text: 'Backup created.' });
    },
    onError: (e: any) => setMsg({ ok: false, text: e?.response?.data?.error || 'Backup failed' }),
  });
  const del = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-backups'] }),
  });

  async function onDownload(b: BackupRow) {
    try {
      await downloadBackup(b.id, b.filename);
    } catch (e: any) {
      setMsg({ ok: false, text: 'Download failed: ' + (e?.message || 'unknown') });
    }
  }

  async function onRestoreFromExisting(b: BackupRow) {
    if (!confirm(`Restore from "${b.filename}"?\n\nThis will OVERWRITE the current database and uploads.\nA pre-restore snapshot is taken first.`)) return;
    setBusy(true); setMsg(null);
    try {
      await restoreFromExisting(b.id);
      setMsg({ ok: true, text: 'Restored. Sign out and sign back in.' });
      qc.invalidateQueries();
    } catch (e: any) {
      setMsg({ ok: false, text: 'Restore failed: ' + (e?.response?.data?.error || e?.message) });
    } finally { setBusy(false); }
  }

  async function onRestoreUpload(file: File | null) {
    if (!file) return;
    if (!confirm(`Restore from "${file.name}"?\n\nThis will OVERWRITE the current database and uploads.\nA pre-restore snapshot is taken first.`)) {
      if (restoreRef.current) restoreRef.current.value = '';
      return;
    }
    setBusy(true); setMsg(null);
    try {
      await restoreFromUpload(file);
      setMsg({ ok: true, text: 'Restored from upload. Sign out and sign back in.' });
      qc.invalidateQueries();
    } catch (e: any) {
      setMsg({ ok: false, text: 'Restore failed: ' + (e?.response?.data?.error || e?.message) });
    } finally {
      setBusy(false);
      if (restoreRef.current) restoreRef.current.value = '';
    }
  }

  const schedule = form.backup_schedule ?? 'off';
  const retention = form.backup_retention_days ?? '30';

  return (
    <section className="bg-white rounded-xl border border-navy-100 p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-navy-900 inline-flex items-center gap-2">
          <Database size={16} /> Backup &amp; Restore
        </h2>
        <p className="text-xs text-navy-500 mt-1">
          Backups bundle the Postgres database + the uploads folder into a single{' '}
          <code>.tar.gz</code>. Download them to your own storage for off-site safety.
        </p>
      </div>

      {/* Schedule */}
      <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-navy-100">
        <div>
          <label className={label}><Clock size={12} className="inline mr-1 -mt-0.5" /> Auto-backup</label>
          <select className={field} value={schedule} onChange={(e) => set('backup_schedule', e.target.value)}>
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <div>
          <label className={label}>Keep backups for (days)</label>
          <input type="number" min={1} max={365} className={field}
            value={retention} onChange={(e) => set('backup_retention_days', e.target.value)} />
          <p className="text-xs text-navy-400 mt-1">Older auto / manual backups are pruned. Pre-restore snapshots are always kept.</p>
        </div>
      </div>
      <p className="text-xs text-navy-500 -mt-1">
        Click <strong>Save changes</strong> at the bottom to persist the schedule.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-navy-100">
        <button type="button" onClick={() => create.mutate()} disabled={create.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
          <Play size={14} /> {create.isPending ? 'Running…' : 'Create backup now'}
        </button>
        <button type="button" onClick={() => restoreRef.current?.click()} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-navy-200 text-navy-800 px-4 py-2 text-sm font-semibold hover:bg-navy-50 disabled:opacity-60">
          <Upload size={14} /> Restore from file…
        </button>
        <input ref={restoreRef} type="file" accept=".gz,.tgz,application/gzip,application/x-gzip" hidden
          onChange={(e) => onRestoreUpload(e.target.files?.[0] ?? null)} />
        <button type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ['admin-backups'] })}
          className="inline-flex items-center gap-1.5 rounded-lg text-navy-500 hover:text-navy-900 px-2 py-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
        {msg && (
          <span className={`text-xs self-center ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>
            {msg.text}
          </span>
        )}
      </div>

      {/* Restore warning */}
      <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-xs text-amber-900">
        <p className="font-semibold inline-flex items-center gap-1.5">
          <AlertTriangle size={14} /> About restore
        </p>
        <p className="mt-1">
          Restore wipes current rows from matching tables and replaces them from the backup.
          A <strong>pre-restore snapshot</strong> is taken automatically before any restore —
          so you can roll back if something's off. After a restore, log out and back in
          because sessions from before the restore are invalid.
        </p>
      </div>

      {/* Backups list */}
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-navy-600">
            <tr>
              <th className="px-6 py-2 font-medium">File</th>
              <th className="px-3 py-2 font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Kind</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-6 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {backups.map((b) => (
              <tr key={b.id} className="hover:bg-navy-50/50">
                <td className="px-6 py-2 font-mono text-xs text-navy-700 max-w-xs truncate" title={b.filename}>
                  {b.filename}
                </td>
                <td className="px-3 py-2 text-xs text-navy-600 whitespace-nowrap">
                  {b.size_bytes > 0 ? fmtSize(b.size_bytes) : '—'}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${kindBadge[b.kind]}`}>
                    {b.kind.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[b.status]}`}>
                    {b.status}
                  </span>
                  {b.status === 'failed' && b.error && (
                    <div className="text-[10px] text-red-600 mt-0.5 max-w-xs truncate" title={b.error}>
                      {b.error}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-navy-500 whitespace-nowrap">
                  {new Date(b.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-2 text-right whitespace-nowrap">
                  {b.status === 'ready' && (
                    <>
                      <button onClick={() => onDownload(b)}
                        className="p-2 rounded-lg text-navy-600 hover:bg-navy-100" title="Download">
                        <Download size={14} />
                      </button>
                      <button onClick={() => onRestoreFromExisting(b)} disabled={busy}
                        className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 disabled:opacity-40" title="Restore from this backup">
                        <Upload size={14} />
                      </button>
                    </>
                  )}
                  <button onClick={() => { if (confirm(`Delete ${b.filename}?`)) del.mutate(b.id); }}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-400">
                No backups yet. Click "Create backup now" above.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
