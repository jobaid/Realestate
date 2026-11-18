import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail, Phone, IdCard, MapPin, ShieldCheck, Award, HeartHandshake, Compass,
  ArrowRight, Facebook, Instagram, Twitter, Quote,
} from 'lucide-react';
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
  const company = s?.company_name || 'NUR Realty';
  const tagline = s?.tagline || '';

  // Split bio into a lead paragraph + rest for better typography
  const bioParagraphs = bio.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const [leadPara, ...otherParas] = bioParagraphs;

  const values = [
    { icon: ShieldCheck, title: 'Trusted guidance',
      body: 'Every decision is backed by data, transparency, and years of local-market expertise.' },
    { icon: HeartHandshake, title: 'Relationship-first',
      body: 'Clients return and refer friends because we treat every family like our own.' },
    { icon: Compass, title: 'Local insight',
      body: 'Deep knowledge of neighborhoods, school districts, and the deals that make sense.' },
    { icon: Award, title: 'Proven results',
      body: 'A track record of successful sales, smooth closings, and happy homeowners.' },
  ];

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-50 via-white to-accent-50/40">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-accent-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-navy-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:pt-20 pb-14 sm:pb-20">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-10 lg:gap-14 items-center">
            {/* Photo frame with decorative accents */}
            <div className="relative mx-auto lg:mx-0 w-full max-w-sm">
              <div className="absolute -top-5 -left-5 h-24 w-24 rounded-2xl bg-accent-500/20 ring-1 ring-accent-500/30" />
              <div className="absolute -bottom-5 -right-5 h-28 w-28 rounded-full bg-navy-900/10 ring-1 ring-navy-300" />
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-navy-200 shadow-2xl bg-navy-100">
                {photo
                  ? <img src={photo} alt={name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-navy-300 text-8xl font-extrabold">
                      {name.charAt(0).toUpperCase()}
                    </div>}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/70 via-transparent to-transparent p-5 text-white">
                  <div className="text-xs uppercase tracking-wider text-accent-300 font-bold">{company}</div>
                  <div className="font-display font-bold text-lg mt-0.5">{name}</div>
                </div>
              </div>
            </div>

            {/* Intro copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-500/10 ring-1 ring-accent-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-accent-700">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> About
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-extrabold text-navy-900 tracking-tight leading-[1.05]">
                Hi, I'm <span className="text-accent-600">{name}</span>.
              </h1>
              <p className="mt-3 text-lg sm:text-xl text-navy-600 font-medium">{role}</p>
              {leadPara && (
                <p className="mt-6 text-base sm:text-lg text-navy-700 leading-relaxed max-w-2xl">
                  {leadPara}
                </p>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                {didEnabled && (
                  <button type="button" onClick={() => setShowDigitalID(true)}
                    className="group inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white px-5 py-3 text-sm font-semibold shadow-lg shadow-accent-500/20 transition">
                    <IdCard size={16} /> Save my Digital ID
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </button>
                )}
                <Link to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-900 text-white px-5 py-3 text-sm font-semibold hover:bg-navy-800 transition">
                  Get in touch <ArrowRight size={14} />
                </Link>
                <Link to="/buy"
                  className="inline-flex items-center rounded-lg bg-white ring-1 ring-navy-200 text-navy-800 px-5 py-3 text-sm font-semibold hover:bg-navy-50 transition">
                  Browse listings
                </Link>
              </div>

              {/* Contact chips */}
              {(s?.phone || s?.email || s?.address) && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {s?.phone && (
                    <ContactChip icon={<Phone size={14} />} href={`tel:${s.phone}`}>{s.phone}</ContactChip>
                  )}
                  {s?.email && (
                    <ContactChip icon={<Mail size={14} />} href={`mailto:${s.email}`}>{s.email}</ContactChip>
                  )}
                  {s?.address && (
                    <ContactChip icon={<MapPin size={14} />}>{s.address}</ContactChip>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Pull quote (tagline) ───────── */}
      {tagline && (
        <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="relative rounded-3xl bg-navy-900 text-white p-8 sm:p-12 overflow-hidden">
            <Quote className="absolute top-6 left-6 text-accent-500/40" size={56} />
            <div className="relative">
              <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-snug max-w-3xl">
                "{tagline}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px w-10 bg-accent-500" />
                <span className="text-xs uppercase tracking-[0.2em] text-accent-300 font-bold">{name} · {role}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Values / Approach ───────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-600">The approach</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-navy-900">
            Built on trust, delivered with care
          </h2>
          <p className="mt-3 text-navy-600">
            Buying or selling a home is one of life's biggest decisions. Here's what you can expect every step of the way.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title}
              className="group rounded-2xl bg-white ring-1 ring-navy-100 p-6 hover:ring-accent-500/40 hover:shadow-lg hover:shadow-accent-500/10 transition">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 group-hover:bg-accent-500 group-hover:text-white transition">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-display font-bold text-lg text-navy-900">{title}</h3>
              <p className="mt-2 text-sm text-navy-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Full bio ───────── */}
      {otherParas.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-600">My story</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-navy-900">
              The journey so far
            </h2>
          </div>
          <div className="space-y-5 text-navy-700 text-base sm:text-lg leading-relaxed [&_p:first-letter]:text-4xl [&_p:first-letter]:font-display [&_p:first-letter]:font-extrabold [&_p:first-letter]:text-accent-600 [&_p:first-letter]:mr-1 [&_p:first-letter]:float-left [&_p:first-letter]:leading-none [&_p:first-letter]:pt-1">
            {otherParas.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>
      )}

      {/* ───────── Social ───────── */}
      {(s?.facebook_url || s?.instagram_url || s?.twitter_url) && (
        <section className="mx-auto max-w-4xl px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-navy-500 mb-3">Follow for new listings, market insights, and more</p>
            <div className="flex justify-center gap-3">
              {s.facebook_url && <SocialBubble href={s.facebook_url} label="Facebook"><Facebook size={18} /></SocialBubble>}
              {s.instagram_url && <SocialBubble href={s.instagram_url} label="Instagram"><Instagram size={18} /></SocialBubble>}
              {s.twitter_url && <SocialBubble href={s.twitter_url} label="Twitter"><Twitter size={18} /></SocialBubble>}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Closing CTA ───────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:pb-20 pt-10 sm:pt-14">
        <div className="relative rounded-3xl bg-gradient-to-br from-accent-500 to-accent-600 text-white p-8 sm:p-12 overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 h-32 w-32 bg-white/10 rounded-full translate-y-10 -translate-x-10" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold">Let's find your next home together</h2>
              <p className="mt-3 text-white/85">
                Have a question, want to schedule a showing, or thinking of selling?
                Reach out — I'll get back to you within one business day.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link to="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white px-5 py-3 text-sm font-semibold transition">
                Contact me <ArrowRight size={14} />
              </Link>
              {didEnabled && (
                <button type="button" onClick={() => setShowDigitalID(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 ring-1 ring-white/20 text-white px-5 py-3 text-sm font-semibold transition">
                  <IdCard size={16} /> Save my card
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {showDigitalID && <DigitalIDModal onClose={() => setShowDigitalID(false)} />}
    </>
  );
}

function ContactChip({ icon, href, children }: { icon: React.ReactNode; href?: string; children: React.ReactNode }) {
  const base = 'inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-navy-200 px-3 py-1.5 text-xs text-navy-700 transition';
  const inner = <>{icon}<span>{children}</span></>;
  if (!href) return <span className={base}>{inner}</span>;
  return <a href={href} className={`${base} hover:ring-accent-500/50 hover:text-accent-700`}>{inner}</a>;
}

function SocialBubble({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-navy-200 text-navy-700 hover:bg-accent-500 hover:ring-accent-500 hover:text-white transition">
      {children}
    </a>
  );
}
