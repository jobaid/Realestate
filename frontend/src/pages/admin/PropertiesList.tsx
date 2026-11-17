import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { adminListProperties, adminDeleteProperty, adminPublish } from '../../lib/adminApi';
import type { Property } from '../../types';

const money = (n?: number | null) => (n == null ? '—' : `$${n.toLocaleString()}`);

export default function PropertiesList() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-props', page, status, search],
    queryFn: () => adminListProperties({ page, status, q: search, page_size: 20 }),
  });

  const del = useMutation({
    mutationFn: adminDeleteProperty,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-props'] }),
  });
  const pub = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) => adminPublish(id, publish),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-props'] }),
  });

  function onDelete(p: Property) {
    if (window.confirm(`Delete "${p.title}"? It will be removed from the site.`)) {
      del.mutate(p.id);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="font-display text-2xl font-bold text-navy-900">Properties</h1>
        <Link to="/admin/properties/new"
          className="rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800">
          + New property
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <form className="flex" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or address…"
            className="rounded-l-lg border border-r-0 border-navy-200 px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-accent-500" />
          <button className="rounded-r-lg border border-navy-200 bg-white px-3 hover:bg-navy-50" aria-label="Search">
            <Search size={16} />
          </button>
        </form>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-navy-200 px-3 py-2 text-sm bg-white">
          <option value="">All statuses</option>
          {['draft', 'available', 'pending', 'sold', 'rented', 'off_market'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-navy-500 text-sm">Loading…</p>}
      {error != null && <p className="text-red-600 text-sm">Failed to load properties.</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {data.data.map((p) => (
                  <tr key={p.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-900">{p.title}</div>
                      <div className="text-xs text-navy-500">{p.address}, {p.city} {p.state}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.listing_type} · {p.property_type}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs capitalize">{p.status}</span></td>
                    <td className="px-4 py-3">{p.listing_type === 'rent' ? `${money(p.monthly_rent)}/mo` : money(p.sale_price)}</td>
                    <td className="px-4 py-3">
                      {p.published_at
                        ? <span className="text-green-700 text-xs font-medium">Live</span>
                        : <span className="text-navy-400 text-xs">Hidden</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button title={p.published_at ? 'Unpublish' : 'Publish'}
                          onClick={() => pub.mutate({ id: p.id, publish: !p.published_at })}
                          className="p-2 rounded-lg hover:bg-navy-100 text-navy-600">
                          {p.published_at ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <Link title="Edit" to={`/admin/properties/${p.id}/edit`}
                          className="p-2 rounded-lg hover:bg-navy-100 text-navy-600"><Pencil size={16} /></Link>
                        <button title="Delete" onClick={() => onDelete(p)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-400">No properties found.</td></tr>
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
