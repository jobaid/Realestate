import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as Cog, Lock } from 'lucide-react';
import { getAdminSettings, updateSettings, type SiteSettings } from '../../lib/adminSettings';
import { changeOwnPassword } from '../../lib/adminUsers';

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
const label = 'block text-sm font-medium text-navy-700 mb-1';

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

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-navy-900 inline-flex items-center gap-2">
        <Cog size={22} /> Settings
      </h1>

      <form onSubmit={submit} className="bg-white rounded-xl border border-navy-100 p-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Company</h2>
        <div><label className={label}>Company name</label>
          <input className={field} value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} /></div>
        <div><label className={label}>Tagline</label>
          <input className={field} value={form.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className={label}>Phone</label>
            <input className={field} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><label className={label}>Email</label>
            <input className={field} type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
        </div>
        <div><label className={label}>Address</label>
          <input className={field} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></div>

        <h2 className="font-semibold text-navy-900 pt-2">Social</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className={label}>Facebook URL</label>
            <input className={field} value={form.facebook_url ?? ''} onChange={(e) => set('facebook_url', e.target.value)} /></div>
          <div><label className={label}>Instagram URL</label>
            <input className={field} value={form.instagram_url ?? ''} onChange={(e) => set('instagram_url', e.target.value)} /></div>
          <div><label className={label}>Twitter URL</label>
            <input className={field} value={form.twitter_url ?? ''} onChange={(e) => set('twitter_url', e.target.value)} /></div>
        </div>

        <div className="flex items-center gap-3 pt-2">
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

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await changeOwnPassword(current, next);
      setMsg({ ok: true, text: 'Password changed. Please sign in again.' });
      setCurrent(''); setNext('');
      setTimeout(() => { window.location.href = '/admin/login'; }, 1500);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.error || 'Change failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-navy-100 p-6 space-y-3">
      <h2 className="font-semibold text-navy-900 inline-flex items-center gap-2">
        <Lock size={16} /> Change my password
      </h2>
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
