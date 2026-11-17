import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin } from 'lucide-react';
import InquiryForm from '../components/InquiryForm';
import { getPublicSettings } from '../lib/adminSettings';
import { useHead } from '../lib/head';

export default function Contact() {
  const { data: s } = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings });
  useHead({
    title: 'Contact us',
    description: 'Questions about a listing, a showing, or selling your home? Get in touch with NUR Realty.',
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="text-3xl md:text-4xl font-extrabold text-navy-900">Contact us</h1>
      <p className="mt-2 text-navy-500">
        Questions about a listing, a showing, or selling your home? Send us a note and
        an agent will be in touch.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-white ring-1 ring-navy-100 p-6 shadow-card">
          <InquiryForm />
        </div>

        <aside className="space-y-4 text-sm">
          {s?.phone && (
            <InfoCard icon={Phone} label="Phone" value={s.phone} href={`tel:${s.phone}`} />
          )}
          {s?.email && (
            <InfoCard icon={Mail} label="Email" value={s.email} href={`mailto:${s.email}`} />
          )}
          {s?.address && (
            <InfoCard icon={MapPin} label="Office" value={s.address} />
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, href }: {
  icon: any; label: string; value: string; href?: string;
}) {
  return (
    <div className="rounded-2xl bg-navy-50 ring-1 ring-navy-100 p-5">
      <div className="flex items-start gap-3">
        <Icon size={18} className="text-accent-600 mt-0.5" />
        <div>
          <div className="font-semibold text-navy-900">{label}</div>
          {href
            ? <a href={href} className="text-navy-700 hover:text-navy-900">{value}</a>
            : <div className="text-navy-700">{value}</div>}
        </div>
      </div>
    </div>
  );
}
