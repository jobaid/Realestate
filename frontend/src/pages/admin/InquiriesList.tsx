import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, Clock } from 'lucide-react';
import { listInquiries } from '../../lib/adminInquiries';

const STATUSES = ['new', 'in_progress', 'responded', 'archived', 'spam'] as const;

const badge: Record<string, string> = {
  new: 'bg-accent-100 text-accent-800',
  in_progress: 'bg-amber-100 text-amber-800',
  responded: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-navy-100 text-navy-700',
  spam: 'bg-red-100 text-red-700',
};

export default function InquiriesList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-inquiries', page, status],
    queryFn: () => listInquiries({ page, status, page_size: 20 }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
          <Mail size={22} /> Inquiries
          {data && data.unread > 0 && (
            <span className="rounded-full bg-accent-600 text-white text-xs font-bold px-2 py-0.5">
              {data.unread} new
            </span>
          )}
        </h1>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setStatus(''); setPage(1); }}
          className={`rounded-full px-3 py-1 text-xs font-medium ${status === '' ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200'}`}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${status === s ? 'bg-navy-900 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-200'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-navy-500 text-sm">Loading…</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-navy-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {data.data.map((i) => (
                  <tr key={i.id} className="hover:bg-navy-50/50">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badge[i.status]}`}>
                        {i.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/inquiries/${i.id}`} className="font-medium text-navy-900 hover:text-accent-700">
                        {i.name}
                      </Link>
                      <div className="text-xs text-navy-500">{i.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {i.property_slug ? (
                        <Link to={`/property/${i.property_slug}`} target="_blank"
                          className="text-accent-700 hover:underline line-clamp-1">
                          {i.property_title}
                        </Link>
                      ) : <span className="text-navy-400">General</span>}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link to={`/admin/inquiries/${i.id}`} className="line-clamp-2 text-navy-700 hover:text-navy-900">
                        {i.message}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-500 whitespace-nowrap">
                      <Clock size={12} className="inline mr-1 -mt-0.5" />
                      {new Date(i.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-navy-400">No inquiries.</td></tr>
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
