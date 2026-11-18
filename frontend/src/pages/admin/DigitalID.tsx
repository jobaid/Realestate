import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IdCard, Upload, User as UserIcon, Eye } from 'lucide-react';
import { getAdminDigitalID, saveDigitalID } from '../../lib/digitalId';
import { adminUploadImage } from '../../lib/adminApi';
import DigitalIDModal from '../../components/DigitalIDModal';

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
const label = 'block text-sm font-medium text-navy-700 mb-1';
const section = 'bg-white rounded-xl border border-navy-100 p-6 space-y-4';
const h2cls = 'font-semibold text-navy-900 inline-flex items-center gap-2';

type Form = {
  did_enabled?: string;
  did_first_name?: string;
  did_last_name?: string;
  did_title?: string;
  did_organization?: string;
  did_phone?: string;
  did_email?: string;
  did_website?: string;
  did_address?: string;
  did_note?: string;
  did_photo_url?: string;
  did_linkedin?: string;
  did_facebook?: string;
  did_instagram?: string;
};

export default function DigitalIDPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminDigitalID });
  const [form, setForm] = useState<Form>({});
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!data) return;
    const f: Form = {};
    Object.keys(data).forEach((k) => {
      if (k.startsWith('did_')) (f as any)[k] = (data as any)[k];
    });
    setForm(f);
  }, [data]);

  const save = useMutation({
    mutationFn: (p: Form) => saveDigitalID(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['public-settings'] });
      qc.invalidateQueries({ queryKey: ['digital-id'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e: FormEvent) { e.preventDefault(); save.mutate(form); }

  const enabled = String(form.did_enabled ?? 'true').toLowerCase() !== 'false';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
          <IdCard size={22} /> Digital ID
        </h1>
        <button onClick={() => setPreview(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-navy-200 text-navy-800 px-3 py-2 text-sm font-semibold hover:bg-navy-50">
          <Eye size={16} /> Preview card
        </button>
      </div>

      <p className="text-sm text-navy-500">
        The <strong>"Save my Digital ID"</strong> button on the About page opens a card with your
        contact details, a QR code, and a vCard download. Scanned or downloaded on a phone, it
        adds you to Contacts — from there users can add you to Apple Wallet or Google Wallet.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <section className={section}>
          <h2 className={h2cls}>Visibility</h2>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={enabled}
              onChange={(e) => set('did_enabled', e.target.checked ? 'true' : 'false')} />
            <span className="text-navy-800">Show "Save my Digital ID" button on the About page</span>
          </label>
        </section>

        <section className={section}>
          <h2 className={h2cls}><UserIcon size={16} /> Identity</h2>
          <PhotoField value={form.did_photo_url ?? ''} onChange={(u) => set('did_photo_url', u)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>First name *</label>
              <input className={field} required value={form.did_first_name ?? ''} onChange={(e) => set('did_first_name', e.target.value)} /></div>
            <div><label className={label}>Last name</label>
              <input className={field} value={form.did_last_name ?? ''} onChange={(e) => set('did_last_name', e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Job title / role</label>
              <input className={field} value={form.did_title ?? ''} onChange={(e) => set('did_title', e.target.value)} /></div>
            <div><label className={label}>Organization / company</label>
              <input className={field} value={form.did_organization ?? ''} onChange={(e) => set('did_organization', e.target.value)} /></div>
          </div>
        </section>

        <section className={section}>
          <h2 className={h2cls}>Contact</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Phone</label>
              <input className={field} type="tel" value={form.did_phone ?? ''} onChange={(e) => set('did_phone', e.target.value)} /></div>
            <div><label className={label}>Email</label>
              <input className={field} type="email" value={form.did_email ?? ''} onChange={(e) => set('did_email', e.target.value)} /></div>
          </div>
          <div><label className={label}>Website</label>
            <input className={field} type="url" placeholder="https://www.nurfl.com" value={form.did_website ?? ''} onChange={(e) => set('did_website', e.target.value)} /></div>
          <div><label className={label}>Address</label>
            <input className={field} value={form.did_address ?? ''} onChange={(e) => set('did_address', e.target.value)} /></div>
          <div><label className={label}>Note</label>
            <textarea className={field} rows={3}
              placeholder="A short line that appears in the saved contact's Notes field."
              value={form.did_note ?? ''} onChange={(e) => set('did_note', e.target.value)} /></div>
        </section>

        <section className={section}>
          <h2 className={h2cls}>Social</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className={label}>LinkedIn URL</label>
              <input className={field} value={form.did_linkedin ?? ''} onChange={(e) => set('did_linkedin', e.target.value)} /></div>
            <div><label className={label}>Facebook URL</label>
              <input className={field} value={form.did_facebook ?? ''} onChange={(e) => set('did_facebook', e.target.value)} /></div>
            <div><label className={label}>Instagram URL</label>
              <input className={field} value={form.did_instagram ?? ''} onChange={(e) => set('did_instagram', e.target.value)} /></div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button disabled={save.isPending}
            className="rounded-lg bg-navy-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
            {save.isPending ? 'Saving…' : 'Save Digital ID'}
          </button>
          {saved && <span className="text-xs text-emerald-700">Saved — the About page updates immediately.</span>}
        </div>
      </form>

      {preview && <DigitalIDModal onClose={() => setPreview(false)} />}
    </div>
  );
}

function PhotoField({ value, onChange }: { value: string; onChange: (u: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const url = await adminUploadImage(f);
      onChange(url);
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <label className={label}>Photo on card</label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-navy-100 ring-1 ring-navy-200 flex items-center justify-center">
          {value
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <UserIcon className="text-navy-300" size={28} />}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-navy-800 disabled:opacity-60 w-fit">
            <Upload size={14} /> {busy ? 'Uploading…' : value ? 'Replace photo' : 'Upload photo'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')}
              className="text-xs text-red-600 hover:underline w-fit">Remove</button>
          )}
          {err && <span className="text-xs text-red-600">{err}</span>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <p className="text-xs text-navy-400 mt-1">Shown on the digital card and in the saved vCard if the contact supports it.</p>
    </div>
  );
}
