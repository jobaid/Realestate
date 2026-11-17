import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { listAudit } from '../../lib/adminAudit';
import { useHead } from '../../lib/head';

const ENTITIES = ['', 'user', 'property', 'inquiry', 'settings'] as const;
const ACTIONS = ['', 'login', 'create', 'update', 'delete', 'publish', 'unpublish', 'change_password'] as const;

const actionBadge: Record<string, string> = {
  login: 'bg-navy-100 text-navy-800',
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-amber-100 text-amber-800',
  delete: 'bg-red-100 text-red-700',
  publish: 'bg-accent-100 text-accent-800',
  unpublish: 'bg-navy-100 text-navy-700',
  change_password: 'bg-purple-100 text-purple-800',
};

export default function Audit() {
  useHead({ title: 'Audit log', robots: 'noindex,nofollow' });
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const { data } = useQuery({
    queryKey: ['admin-audit', page, entity, action],
    queryFn: () => listAudit({ page, entity, action, page_size: 50 }),
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2 mb-5">
        <History size={22} /> Audit log
      </h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="rounded-lg border border-navy-200 px-3 py-2 text-sm bg-white">
          {ENTITIES.map((e) => <option key={e} value={e}>{e || 'All entities'}</option>)}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="rounded-lg border border-navy-200 px-3 py-2 text-sm bg-white">
          {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}
        </select>
      </div>

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {data.data.map((r) => (
                  <tr key={r.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3 text-xs text-navy-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-700">
                      {r.user_email ?? <span className="text-navy-400">anonymous</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionBadge[r.action] ?? 'bg-navy-100 text-navy-700'}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.entity ? <><span className="text-navy-700 font-medium">{r.entity}</span>
                        {r.entity_id && <span className="text-navy-400 ml-1 font-mono">{r.entity_id.slice(0, 8)}…</span>}</>
                        : <span className="text-navy-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500 font-mono">{r.ip_addr ?? '—'}</td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-navy-400">No audit entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-navy-600">
            <span>{data.total} entries</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                className="rounded-lg border border-navy-200 px-3 py-1.5 disabled:opacity-40 bg-white">Prev</button>
              <span className="px-2 py-1.5">Page {data.page} / {Math.max(1, data.total_pages)}</span>
              <button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}
                className="rounded-lg border border-navy-200 px-3 py-1.5 disabled:opacity-40 bg-white">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
