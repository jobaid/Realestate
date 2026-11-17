import { FormEvent, useState } from 'react';
import { submitInquiry } from '../lib/publicApi';

interface Props {
  propertyId?: string;
  compact?: boolean;
  defaultMessage?: string;
}

export default function InquiryForm({ propertyId, compact, defaultMessage }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(defaultMessage ?? '');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await submitInquiry({
        property_id: propertyId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim(),
        source: propertyId ? 'property' : 'contact',
      });
      setOk(true);
      setName(''); setEmail(''); setPhone(''); setMessage('');
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 429
          ? 'Too many requests — please try again in a few minutes.'
          : e?.response?.data?.error || 'Could not send your message. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (ok) {
    return (
      <div className="rounded-lg bg-accent-50 ring-1 ring-accent-200 p-4 text-sm text-accent-800">
        Thanks — your message has been received. An agent will respond shortly.
        <button type="button" onClick={() => setOk(false)}
          className="mt-2 block text-accent-700 underline underline-offset-2">
          Send another message
        </button>
      </div>
    );
  }

  const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
  const grid = compact ? 'space-y-3' : 'space-y-4';

  return (
    <form onSubmit={onSubmit} className={grid}>
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="iq-name">Full name</label>
        <input id="iq-name" required minLength={2} className={field}
          value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={compact ? 'space-y-3' : 'grid sm:grid-cols-2 gap-4'}>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="iq-email">Email</label>
          <input id="iq-email" type="email" required className={field}
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="iq-phone">Phone (optional)</label>
          <input id="iq-phone" type="tel" className={field}
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-navy-700 mb-1" htmlFor="iq-msg">Message</label>
        <textarea id="iq-msg" required minLength={5} rows={compact ? 3 : 5} className={field}
          value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy}
        className="w-full rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 text-sm disabled:opacity-60">
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
