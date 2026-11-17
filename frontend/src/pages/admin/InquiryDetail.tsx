import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, Trash2 } from 'lucide-react';
import { deleteInquiry, getInquiry, updateInquiry } from '../../lib/adminInquiries';

const STATUSES = ['new', 'in_progress', 'responded', 'archived', 'spam'] as const;

export default function InquiryDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-inquiry', id], queryFn: () => getInquiry(id), enabled: !!id });
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setNotes(data.admin_notes ?? ''); }, [data]);

  const patch = useMutation({
    mutationFn: (p: { status?: string; admin_notes?: string }) => updateInquiry(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-inquiry', id] });
      qc.invalidateQueries({ queryKey: ['admin-inquiries'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const del = useMutation({
    mutationFn: () => deleteInquiry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-inquiries'] });
      nav('/admin/inquiries');
    },
  });

  if (isLoading || !data) return <p className="text-navy-500 text-sm">Loading…</p>;

  const mailto = `mailto:${data.email}?subject=${encodeURIComponent(
    data.property_title ? `Re: ${data.property_title}` : 'Re: your inquiry',
  )}`;

  return (
    <div className="max-w-3xl">
      <Link to="/admin/inquiries" className="inline-flex items-center text-sm text-navy-500 hover:text-navy-900 mb-4">
        <ArrowLeft size={14} className="mr-1" /> Back to inquiries
      </Link>

      <div className="bg-white rounded-xl border border-navy-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900">{data.name}</h1>
            <div className="mt-1 text-sm text-navy-600 flex flex-wrap items-center gap-4">
              <a href={mailto} className="inline-flex items-center gap-1 hover:text-accent-700">
                <Mail size={14} /> {data.email}
              </a>
              {data.phone && (
                <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1 hover:text-accent-700">
                  <Phone size={14} /> {data.phone}
                </a>
              )}
            </div>
            {data.property_title && (
              <div className="mt-2 text-sm">
                Regarding:{' '}
                <Link to={`/property/${data.property_slug}`} target="_blank" className="text-accent-700 hover:underline">
                  {data.property_title}
                </Link>
              </div>
            )}
            <div className="mt-1 text-xs text-navy-400">
              Received {new Date(data.created_at).toLocaleString()}
            </div>
          </div>
          <select value={data.status} onChange={(e) => patch.mutate({ status: e.target.value })}
            className="rounded-lg border border-navy-200 px-3 py-2 text-sm bg-white capitalize">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-navy-500">Message</h2>
        <div className="mt-2 whitespace-pre-line text-navy-800 leading-relaxed rounded-lg bg-navy-50 p-4">
          {data.message}
        </div>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-navy-500">Internal notes</h2>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Not visible to the sender."
          className="mt-2 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500" />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => patch.mutate({ admin_notes: notes })}
            className="rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800">
            Save notes
          </button>
          <a href={mailto}
            className="rounded-lg bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 text-sm font-semibold">
            Reply via email
          </a>
          <button onClick={() => {
            if (confirm('Delete this inquiry? This cannot be undone.')) del.mutate();
          }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
          {saved && <span className="text-xs text-emerald-700">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
