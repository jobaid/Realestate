import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Download, Share2, QrCode, Smartphone, Apple, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { getDigitalID } from '../lib/digitalId';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';
const vcfUrl = `${baseURL}/digital-id.vcf`;
const qrUrl = `${baseURL}/digital-id.qr`;

export default function DigitalIDModal({ onClose }: { onClose: () => void }) {
  const { data: did, isLoading } = useQuery({ queryKey: ['digital-id'], queryFn: getDigitalID });
  const [copied, setCopied] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function share() {
    const absoluteVcf = new URL(vcfUrl, window.location.origin).toString();
    if (navigator.share) {
      try { await navigator.share({ title: 'My Digital ID', url: absoluteVcf }); return; } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(absoluteVcf);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* no-op */ }
  }

  const fullName = did ? `${did.first_name} ${did.last_name}`.trim() || did.organization : '';

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-navy-100">
          <h2 className="font-display font-bold text-lg inline-flex items-center gap-2">
            <QrCode size={20} /> Digital ID
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-700">
            <X size={20} />
          </button>
        </div>

        {isLoading || !did ? (
          <div className="p-10 text-center text-navy-500 text-sm">Loading…</div>
        ) : (
          <>
            {/* Card preview */}
            <div className="p-5">
              <div className="rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white p-5 shadow-xl">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-white/10 ring-2 ring-white/30 overflow-hidden flex items-center justify-center text-xl font-bold shrink-0">
                    {did.photo_url
                      ? <img src={did.photo_url} alt="" className="w-full h-full object-cover" />
                      : <span>{(did.first_name[0] || did.organization[0] || '?').toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-accent-300 font-semibold">{did.organization}</div>
                    <div className="font-display font-bold text-xl leading-tight truncate">{fullName || 'My Contact'}</div>
                    <div className="text-sm text-white/70 truncate">{did.title}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-white/90">
                  {did.phone && <IconLine icon={<Phone size={14} />} text={did.phone} />}
                  {did.email && <IconLine icon={<Mail size={14} />} text={did.email} />}
                  {did.website && <IconLine icon={<Globe size={14} />} text={did.website.replace(/^https?:\/\//, '')} />}
                  {did.address && <IconLine icon={<MapPin size={14} />} text={did.address} />}
                </div>
              </div>

              {/* QR code */}
              <div className="mt-5 rounded-xl bg-navy-50 p-5 flex items-center gap-4">
                <img src={qrUrl} alt="QR code — scan to save contact"
                  className="h-28 w-28 rounded-lg bg-white p-1.5 shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold text-navy-900">Scan with your phone</div>
                  <p className="text-navy-600 text-xs mt-1">
                    Opens the contact card automatically. On iPhone tap "Create New Contact" — on Android tap "Save contact".
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={vcfUrl} download
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 text-white px-4 py-3 text-sm font-semibold hover:bg-navy-800">
                  <Download size={16} /> Download vCard
                </a>
                <button onClick={share}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 text-white px-4 py-3 text-sm font-semibold hover:bg-accent-700">
                  <Share2 size={16} /> {copied ? 'Link copied!' : 'Share'}
                </button>
              </div>

              <div className="mt-4 rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-xs text-amber-900">
                <p className="font-semibold mb-1 inline-flex items-center gap-1.5">
                  <Apple size={12} /> <Smartphone size={12} /> Adding to Wallet
                </p>
                <p>
                  After saving to Contacts, open the contact → scroll down → tap{' '}
                  <strong>"Share Contact"</strong> → <strong>"Add to Apple Wallet"</strong> (iOS) or long-press →{' '}
                  <strong>"Add to Google Wallet"</strong> (Android, where available).
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IconLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/60 shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}
