import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as Cog, Lock, Upload, Mail, User as UserIcon, Send, Image as ImageIcon } from 'lucide-react';
import {
  getAdminSettings, updateSettings, sendSMTPTest, type SiteSettings,
} from '../../lib/adminSettings';
import { changeOwnPassword } from '../../lib/adminUsers';
import { adminUploadImage } from '../../lib/adminApi';
import BackupSection from '../../components/BackupSection';
import { getUser } from '../../lib/auth';

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
const label = 'block text-sm font-medium text-navy-700 mb-1';
const section = 'bg-white rounded-xl border border-navy-100 p-6 space-y-4';
const h2cls = 'font-semibold text-navy-900 inline-flex items-center gap-2';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings });
  const [form, setForm] = useState<SiteSettings>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: (s: SiteSettings) => updateSettings(s),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['public-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function submit(e: FormEvent) { e.preventDefault(); save.mutate(form); }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
        <Cog size={22} /> Settings
      </h1>

      <form onSubmit={submit} className="space-y-6">
        {/* Company */}
        <section className={section}>
          <h2 className={h2cls}>Company</h2>
          <LogoField value={form.logo_url ?? ''} onChange={(u) => set('logo_url', u)} />
          <div><label className={label}>Company name</label>
            <input className={field} value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} /></div>
          <div><label className={label}>Tagline</label>
            <input className={field} value={form.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Phone</label>
              <input className={field} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><label className={label}>Public email</label>
              <input className={field} type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
          </div>
          <div><label className={label}>Address</label>
            <input className={field} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className={label}>Facebook URL</label>
              <input className={field} value={form.facebook_url ?? ''} onChange={(e) => set('facebook_url', e.target.value)} /></div>
            <div><label className={label}>Instagram URL</label>
              <input className={field} value={form.instagram_url ?? ''} onChange={(e) => set('instagram_url', e.target.value)} /></div>
            <div><label className={label}>Twitter URL</label>
              <input className={field} value={form.twitter_url ?? ''} onChange={(e) => set('twitter_url', e.target.value)} /></div>
          </div>
        </section>

        {/* About page */}
        <section className={section}>
          <h2 className={h2cls}><UserIcon size={16} /> About page</h2>
          <p className="text-xs text-navy-500 -mt-2">
            Shown at <code className="text-xs">/about</code> on the public site.
          </p>
          <PhotoField value={form.about_photo_url ?? ''} onChange={(u) => set('about_photo_url', u)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>Your name</label>
              <input className={field} value={form.about_name ?? ''} onChange={(e) => set('about_name', e.target.value)} /></div>
            <div><label className={label}>Your title / role</label>
              <input className={field} value={form.about_title ?? ''} onChange={(e) => set('about_title', e.target.value)} /></div>
          </div>
          <div><label className={label}>Bio</label>
            <textarea rows={7} className={field}
              placeholder="Tell visitors about your experience, approach, and specialties…"
              value={form.about_bio ?? ''} onChange={(e) => set('about_bio', e.target.value)} />
          </div>
        </section>

        {/* SMTP */}
        <section className={section}>
          <h2 className={h2cls}><Mail size={16} /> Email / SMTP</h2>
          <p className="text-xs text-navy-500 -mt-2">
            Used to send contact-form notifications and email broadcasts. Common presets: Gmail
            <code className="mx-1">smtp.gmail.com:587</code>, Outlook <code>smtp.office365.com:587</code>,
            SendGrid <code>smtp.sendgrid.net:587</code>.
          </p>
          <div><label className={label}>Notification email (where inquiries go)</label>
            <input className={field} type="email" value={form.notify_email ?? ''} onChange={(e) => set('notify_email', e.target.value)} /></div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className={label}>SMTP host</label>
              <input className={field} placeholder="smtp.gmail.com" value={form.smtp_host ?? ''} onChange={(e) => set('smtp_host', e.target.value)} /></div>
            <div><label className={label}>Port</label>
              <input className={field} value={form.smtp_port ?? ''} onChange={(e) => set('smtp_port', e.target.value)} />
              <p className="text-xs text-navy-400 mt-1">465 = TLS, 587 = STARTTLS</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>SMTP username</label>
              <input className={field} autoComplete="off" value={form.smtp_user ?? ''} onChange={(e) => set('smtp_user', e.target.value)} /></div>
            <div><label className={label}>SMTP password</label>
              <input className={field} type="password" autoComplete="new-password"
                placeholder={form.smtp_password === '••••••••' ? '•••••••• (saved — enter to change)' : ''}
                onChange={(e) => set('smtp_password', e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label}>From name</label>
              <input className={field} value={form.smtp_from_name ?? ''} onChange={(e) => set('smtp_from_name', e.target.value)} /></div>
            <div><label className={label}>From address</label>
              <input className={field} type="email" value={form.smtp_from_address ?? ''} onChange={(e) => set('smtp_from_address', e.target.value)} /></div>
          </div>
          <SMTPTester />
        </section>

        {/* Backup & Restore — super_admin only */}
        {getUser()?.role === 'super_admin' && (
          <BackupSection form={form} set={(k, v) => set(k, v)} />
        )}

        <div className="flex items-center gap-3">
          <button disabled={save.isPending}
            className="rounded-lg bg-navy-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-xs text-emerald-700">Saved.</span>}
        </div>
      </form>

      <PasswordCard />
    </div>
  );
}

function LogoField({ value, onChange }: { value: string; onChange: (u: string) => void }) {
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
      <label className={label}>Logo (header &amp; footer)</label>
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 rounded-xl overflow-hidden bg-navy-50 ring-1 ring-navy-200 flex items-center justify-center p-2">
          {value
            ? <img src={value} alt="Logo" className="max-w-full max-h-full object-contain" />
            : <ImageIcon className="text-navy-300" size={32} />}
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-navy-800 disabled:opacity-60 w-fit">
            <Upload size={14} /> {busy ? 'Uploading…' : value ? 'Replace logo' : 'Upload logo'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange('')}
              className="text-xs text-red-600 hover:underline w-fit">Remove</button>
          )}
          {err && <span className="text-xs text-red-600">{err}</span>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <p className="text-xs text-navy-400 mt-2">
        PNG / JPEG / WebP / SVG — up to 16 MB. Upload at any resolution (e.g. 2000×2000); the
        site renders it at header ~40px tall and footer ~64px tall while preserving the aspect
        ratio. Use a transparent PNG or SVG for best results on the dark footer.
      </p>
    </div>
  );
}

function PhotoField({ value, onChange }: { value: string; onChange: (u: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true); setError('');
    try {
      const url = await adminUploadImage(f);
      onChange(url);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <label className={label}>Profile photo</label>
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
              className="text-xs text-red-600 hover:underline w-fit">
              Remove
            </button>
          )}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
    </div>
  );
}

function SMTPTester() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true); setMsg(null);
    try {
      const r = await sendSMTPTest();
      setMsg({ ok: true, text: `Test email sent to ${r.sent_to}.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.error || 'Test failed' });
    } finally { setBusy(false); }
  }

  return (
    <div className="pt-2 border-t border-navy-100">
      <button type="button" onClick={run} disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50 disabled:opacity-60">
        <Send size={14} /> {busy ? 'Sending…' : 'Send test email'}
      </button>
      <p className="text-xs text-navy-400 mt-1">
        Save your SMTP settings first, then click to send a test to the notification email.
      </p>
      {msg && <p className={`text-xs mt-2 ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await changeOwnPassword(current, next);
      setMsg({ ok: true, text: 'Password changed. Please sign in again.' });
      setCurrent(''); setNext('');
      setTimeout(() => { window.location.href = '/admin/login'; }, 1500);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.error || 'Change failed.' });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className={section}>
      <h2 className={h2cls}><Lock size={16} /> Change my password</h2>
      <div><label className={label}>Current password</label>
        <input className={field} type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
      <div><label className={label}>New password</label>
        <input className={field} type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} /></div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
      <button disabled={busy}
        className="rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
