import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Trash2, Upload, Search } from 'lucide-react';
import {
  listContacts, createContact, importContacts, updateContact, deleteContact,
} from '../../lib/adminContacts';

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
const label = 'block text-sm font-medium text-navy-700 mb-1';

export default function Contacts() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin-contacts', page, search],
    queryFn: () => listContacts({ page, q: search, page_size: 50 }),
  });

  const del = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-contacts'] }),
  });
  const upd = useMutation({
    mutationFn: ({ id, p }: { id: string; p: any }) => updateContact(id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-contacts'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
          <Users size={22} /> Email contacts
          {data && (
            <span className="text-sm font-normal text-navy-500">
              · {data.subscribed} subscribed of {data.total}
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-navy-200 text-navy-800 px-3 py-2 text-sm font-semibold hover:bg-navy-50">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white px-3 py-2 text-sm font-semibold hover:bg-navy-800">
            <Plus size={16} /> Add contact
          </button>
        </div>
      </div>

      <form className="flex mb-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name…"
          className="rounded-l-lg border border-r-0 border-navy-200 px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-accent-500" />
        <button className="rounded-r-lg border border-navy-200 bg-white px-3 hover:bg-navy-50" aria-label="Search">
          <Search size={16} />
        </button>
      </form>

      {showAdd && <AddDialog onClose={() => setShowAdd(false)}
        onDone={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ['admin-contacts'] }); }} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)}
        onDone={() => { setShowImport(false); qc.invalidateQueries({ queryKey: ['admin-contacts'] }); }} />}

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Tags</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-900">{c.name || '—'}</div>
                      <div className="text-xs text-navy-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-600">{c.tags || '—'}</td>
                    <td className="px-4 py-3 text-xs text-navy-500 capitalize">{c.source}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!c.unsubscribed}
                          onChange={(e) => upd.mutate({ id: c.id, p: { unsubscribed: !e.target.checked } })} />
                        <span className={c.unsubscribed ? 'text-navy-400' : 'text-emerald-700'}>
                          {c.unsubscribed ? 'Unsubscribed' : 'Subscribed'}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { if (confirm(`Delete ${c.email}?`)) del.mutate(c.id); }}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-400">No contacts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-navy-600">
            <span>{data.total} total</span>
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

function AddDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    try { await createContact({ email, name, tags }); onDone(); }
    catch (e: any) { setErr(e?.response?.data?.error || 'Failed'); }
  }

  return (
    <Dialog onClose={onClose} title="Add contact">
      <form onSubmit={submit} className="space-y-3">
        <div><label className={label}>Email *</label>
          <input className={field} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className={label}>Name</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={label}>Tags (comma-separated)</label>
          <input className={field} placeholder="buyer, newsletter" value={tags} onChange={(e) => setTags(e.target.value)} /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2 pt-2">
          <button className="rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800">Add</button>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">Cancel</button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [emails, setEmails] = useState('');
  const [tags, setTags] = useState('');
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await importContacts({ emails, tags });
      setResult(r);
    } finally { setBusy(false); }
  }

  return (
    <Dialog onClose={onClose} title="Bulk import contacts">
      <form onSubmit={submit} className="space-y-3">
        <div><label className={label}>Paste emails (comma, semicolon, or one per line)</label>
          <textarea className={field} rows={8} required
            placeholder="alice@example.com, bob@example.com&#10;charlie@example.com"
            value={emails} onChange={(e) => setEmails(e.target.value)} /></div>
        <div><label className={label}>Tags to apply (optional)</label>
          <input className={field} value={tags} onChange={(e) => setTags(e.target.value)} /></div>
        {result && (
          <p className="text-sm text-emerald-700">
            Added {result.added} · Skipped {result.skipped} (duplicates or invalid).
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <button disabled={busy} className="rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
            {busy ? 'Importing…' : 'Import'}
          </button>
          <button type="button" onClick={() => (result ? onDone() : onClose())}
            className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50">
            {result ? 'Done' : 'Cancel'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Dialog({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="fixed inset-0 z-40 bg-navy-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="font-display font-bold text-xl mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
