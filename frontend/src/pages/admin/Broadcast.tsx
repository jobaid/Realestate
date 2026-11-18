import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, Trash2, Image as ImageIcon, Link2, Eye, Plus } from 'lucide-react';
import {
  listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, sendCampaign,
  type CampaignRow,
} from '../../lib/adminCampaigns';
import { adminUploadImage } from '../../lib/adminApi';
import { adminListProperties } from '../../lib/adminApi';

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
const label = 'block text-sm font-medium text-navy-700 mb-1';

const statusBadge: Record<string, string> = {
  draft: 'bg-navy-100 text-navy-700',
  sending: 'bg-amber-100 text-amber-800',
  sent: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-700',
};

export default function Broadcast() {
  const qc = useQueryClient();
  const { data: list = [] } = useQuery({ queryKey: ['admin-campaigns'], queryFn: listCampaigns, refetchInterval: 5_000 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const del = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-campaigns'] }),
  });

  if (composing || editingId) {
    return <Composer id={editingId} onDone={() => { setComposing(false); setEditingId(null); qc.invalidateQueries({ queryKey: ['admin-campaigns'] }); }} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
          <Megaphone size={22} /> Email broadcasts
        </h1>
        <button onClick={() => setComposing(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800">
          <Plus size={16} /> New broadcast
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-left text-navy-600">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {list.map((c: CampaignRow) => (
              <tr key={c.id} className="hover:bg-navy-50/50">
                <td className="px-4 py-3 font-medium text-navy-900 max-w-md line-clamp-1">{c.subject}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge[c.status]}`}>
                    {c.status}
                  </span>
                  {c.status === 'failed' && c.last_error && (
                    <div className="text-[10px] text-red-600 mt-0.5 max-w-xs truncate" title={c.last_error}>
                      {c.last_error}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-navy-600">
                  {c.total_targets > 0
                    ? `${c.sent_count}/${c.total_targets}${c.failed_count > 0 ? ` (${c.failed_count} failed)` : ''}`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-navy-500 whitespace-nowrap">
                  {new Date(c.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.status === 'draft' && (
                    <button onClick={() => setEditingId(c.id)}
                      className="text-xs text-accent-700 hover:underline mr-2">
                      Edit
                    </button>
                  )}
                  <button onClick={() => { if (confirm(`Delete "${c.subject}"?`)) del.mutate(c.id); }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 align-middle">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-navy-400">
                No broadcasts yet. Click "New broadcast" to compose one.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Composer({ id, onDone }: { id: string | null; onDone: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('<p>Hi there,</p><p>We have exciting new listings to share!</p>');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const { data: existing } = useQuery({
    queryKey: ['admin-campaign', id],
    queryFn: () => id ? getCampaign(id) : Promise.reject(),
    enabled: !!id,
  });
  useEffect(() => {
    if (existing) { setSubject(existing.subject); setBody(existing.body_html || ''); }
  }, [existing]);

  // Property picker — list latest 10 properties admin can insert as cards.
  const { data: props } = useQuery({
    queryKey: ['admin-props-for-broadcast'],
    queryFn: () => adminListProperties({ page: 1, page_size: 10 }),
  });

  function insertAtCursor(text: string) {
    const ta = bodyRef.current;
    if (!ta) { setBody(body + text); return; }
    const start = ta.selectionStart, end = ta.selectionEnd;
    setBody(body.slice(0, start) + text + body.slice(end));
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + text.length; }, 0);
  }

  async function onUploadImage(f: File) {
    try {
      const url = await adminUploadImage(f);
      insertAtCursor(`\n<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:8px" />\n`);
    } catch (e: any) { setErr(e?.response?.data?.error || 'Upload failed'); }
  }

  function insertLink() {
    const url = prompt('Paste the URL:');
    if (!url) return;
    const text = prompt('Link text:', url) || url;
    insertAtCursor(`<a href="${url}" style="color:#f97316;font-weight:600">${text}</a>`);
  }

  function insertProperty(p: any) {
    const base = window.location.origin.replace('my.', 'www.');
    const img = p.images?.[0]?.url || '';
    const price = p.sale_price ? `$${p.sale_price.toLocaleString()}`
      : p.monthly_rent ? `$${p.monthly_rent.toLocaleString()}/mo` : '';
    insertAtCursor(`
<table cellspacing="0" cellpadding="0" style="margin:16px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;width:100%;max-width:520px">
  <tr>${img ? `<td width="180" style="padding:0"><img src="${img}" width="180" style="display:block;width:180px;height:auto" /></td>` : ''}
    <td style="padding:14px 16px;vertical-align:top">
      <div style="font-size:18px;font-weight:700;color:#0f172a">${price}</div>
      <div style="font-size:14px;color:#334155;margin-top:4px">${p.title}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">${p.address}, ${p.city}, ${p.state}</div>
      <a href="${base}/property/${p.slug}" style="display:inline-block;margin-top:10px;background:#0f172a;color:#fff;font-weight:600;font-size:12px;padding:8px 14px;border-radius:6px;text-decoration:none">View property →</a>
    </td>
  </tr>
</table>`);
  }

  async function save(sendAfter: boolean) {
    setErr(''); setBusy(true);
    try {
      let cid = id;
      if (cid) {
        await updateCampaign(cid, { subject, body_html: body });
      } else {
        const r = await createCampaign({ subject, body_html: body });
        cid = r.id;
      }
      if (sendAfter && cid) {
        const r = await sendCampaign(cid);
        alert(`Queued — sending to ${r.targets} contacts. Progress updates live in the list.`);
      }
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Save failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-4xl">
      <button onClick={onDone} className="text-sm text-navy-500 hover:text-navy-900 mb-4">← Back to broadcasts</button>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-5">
        {id ? 'Edit broadcast' : 'New broadcast'}
      </h1>

      <form onSubmit={(e) => { e.preventDefault(); save(false); }} className="space-y-4 bg-white rounded-xl border border-navy-100 p-6">
        <div>
          <label className={label}>Subject *</label>
          <input className={field} required minLength={2} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={label + ' mb-0'}>HTML body *</label>
            <div className="flex gap-1">
              <ToolbarBtn onClick={() => { const el = document.createElement('input'); el.type = 'file'; el.accept = 'image/*'; el.onchange = () => el.files?.[0] && onUploadImage(el.files[0]); el.click(); }}
                icon={<ImageIcon size={14} />} label="Image" />
              <ToolbarBtn onClick={insertLink} icon={<Link2 size={14} />} label="Link" />
              <ToolbarBtn onClick={() => setPreview((v) => !v)} icon={<Eye size={14} />} label={preview ? 'Edit' : 'Preview'} />
            </div>
          </div>
          {preview ? (
            <div className="border border-navy-200 rounded-lg p-4 bg-white min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: body }} />
          ) : (
            <textarea ref={bodyRef} className={field + ' font-mono text-xs'} rows={16}
              required value={body} onChange={(e) => setBody(e.target.value)} />
          )}
        </div>

        {props && props.data.length > 0 && (
          <div>
            <label className={label}>Insert a property card</label>
            <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {props.data.map((p: any) => (
                <button type="button" key={p.id} onClick={() => insertProperty(p)}
                  className="text-left flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-2 py-2 text-xs hover:bg-navy-50">
                  {p.images?.[0] && <img src={p.images[0].url} className="h-10 w-10 object-cover rounded" alt="" />}
                  <span className="line-clamp-1">{p.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button type="submit" disabled={busy || !subject || !body}
            className="rounded-lg bg-white ring-1 ring-navy-200 text-navy-800 px-4 py-2 text-sm font-semibold hover:bg-navy-50 disabled:opacity-60">
            Save draft
          </button>
          <button type="button" disabled={busy || !subject || !body}
            onClick={() => { if (confirm('Send this broadcast to ALL subscribed contacts? This cannot be undone.')) save(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 text-white px-4 py-2 text-sm font-semibold hover:bg-accent-700 disabled:opacity-60">
            <Send size={14} /> Save & send to all contacts
          </button>
          <button type="button" onClick={onDone}
            className="rounded-lg px-4 py-2 text-sm text-navy-600 hover:bg-navy-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ToolbarBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-navy-200 bg-white px-2 py-1 text-xs text-navy-700 hover:bg-navy-50">
      {icon} {label}
    </button>
  );
}
