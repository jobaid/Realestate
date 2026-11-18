import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, IdCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPublicSettings } from '../lib/adminSettings';
import { useHead } from '../lib/head';
import DigitalIDModal from '../components/DigitalIDModal';

export default function About() {
  const { data: s } = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings });
  const [showDigitalID, setShowDigitalID] = useState(false);
  const didEnabled = String(s?.['did_enabled' as keyof typeof s] ?? 'true').toLowerCase() !== 'false';

  useHead({
    title: 'About',
    description: s?.about_bio?.slice(0, 200) || 'Meet the team behind NUR Realty.',
  });

  const name = s?.about_name || 'Your Name';
  const role = s?.about_title || 'Realtor';
  const bio = s?.about_bio || '';
  const photo = s?.about_photo_url || '';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <div className="grid md:grid-cols-[320px_1fr] gap-8 lg:gap-12 items-start">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-navy-100 ring-1 ring-navy-200 flex items-center justify-center text-navy-300 text-6xl font-bold">
            {photo
              ? <img src={photo} alt={name} className="w-full h-full object-cover" />
              : <span>{name.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="mt-6 space-y-2">
            {s?.phone && (
              <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-sm text-navy-700 hover:text-accent-700">
                <Phone size={14} /> {s.phone}
              </a>
            )}
            {s?.email && (
              <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-sm text-navy-700 hover:text-accent-700">
                <Mail size={14} /> {s.email}
              </a>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">About</p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy-900">{name}</h1>
          <p className="mt-2 text-lg text-navy-600">{role}</p>
          <div className="mt-6 prose prose-navy max-w-none text-navy-700 leading-relaxed whitespace-pre-line">
            {bio}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {didEnabled && (
              <button type="button" onClick={() => setShowDigitalID(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white px-5 py-3 text-sm font-semibold">
                <IdCard size={16} /> Save my Digital ID
              </button>
            )}
            <Link to="/contact"
              className="inline-flex items-center rounded-lg bg-navy-900 text-white px-5 py-3 text-sm font-semibold hover:bg-navy-800">
              Get in touch
            </Link>
            <Link to="/buy"
              className="inline-flex items-center rounded-lg bg-white ring-1 ring-navy-200 text-navy-800 px-5 py-3 text-sm font-semibold hover:bg-navy-50">
              Browse listings
            </Link>
          </div>
        </div>
      </div>

      {showDigitalID && <DigitalIDModal onClose={() => setShowDigitalID(false)} />}
    </div>
  );
}
