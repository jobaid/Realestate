import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Facebook, Instagram, Twitter, Phone, Mail, MapPin, ArrowUpRight, Home,
} from 'lucide-react';
import { getPublicSettings } from '../lib/adminSettings';

export default function Footer() {
  const { data: s } = useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    staleTime: 5 * 60_000,
  });

  const name = s?.company_name || 'NUR Realty';
  const tagline = s?.tagline || 'Helping families find the right home.';
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 sm:mt-28 bg-navy-900 text-navy-100">
      {/* Accent top band */}
      <div className="h-1 bg-gradient-to-r from-accent-500 via-accent-400 to-accent-600" />

      {/* CTA strip */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h3 className="text-white font-display text-2xl sm:text-3xl font-extrabold leading-tight">
              Ready to find your next home?
            </h3>
            <p className="mt-2 text-navy-100/70 text-sm sm:text-base">
              Our team is ready to help — whether you're buying, selling, or just exploring the market.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white px-5 py-3 text-sm font-semibold transition">
              Contact our team <ArrowUpRight size={16} />
            </Link>
            <Link to="/buy"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-white px-5 py-3 text-sm font-semibold transition">
              Browse listings
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-auto max-w-7xl px-4 py-14 grid gap-10 md:grid-cols-12">
        {/* Brand column */}
        <div className="md:col-span-4">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 ring-1 ring-accent-500/30 text-accent-400 group-hover:bg-accent-500/25 transition">
              <Home size={20} />
            </span>
            <span className="font-display font-bold text-white text-xl tracking-tight">{name}</span>
          </Link>
          <p className="mt-4 text-sm text-navy-100/70 leading-relaxed max-w-sm">{tagline}</p>

          {(s?.facebook_url || s?.instagram_url || s?.twitter_url) && (
            <div className="mt-6 flex gap-2">
              {s.facebook_url && (
                <SocialLink href={s.facebook_url} label="Facebook"><Facebook size={16} /></SocialLink>
              )}
              {s.instagram_url && (
                <SocialLink href={s.instagram_url} label="Instagram"><Instagram size={16} /></SocialLink>
              )}
              {s.twitter_url && (
                <SocialLink href={s.twitter_url} label="Twitter"><Twitter size={16} /></SocialLink>
              )}
            </div>
          )}
        </div>

        {/* Explore */}
        <FooterCol className="md:col-span-2" title="Explore"
          links={[['Buy', '/buy'], ['Rent', '/rent'], ['Recently Sold', '/sold'], ['Favorites', '/favorites']]} />

        {/* Company */}
        <FooterCol className="md:col-span-2" title="Company"
          links={[['About', '/about'], ['Contact', '/contact']]} />

        {/* Contact */}
        <div className="md:col-span-4">
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-accent-400 mb-4">Get in touch</div>
          <ul className="space-y-3 text-sm">
            {s?.phone && (
              <ContactLine icon={<Phone size={14} />} href={`tel:${s.phone}`}>{s.phone}</ContactLine>
            )}
            {s?.email && (
              <ContactLine icon={<Mail size={14} />} href={`mailto:${s.email}`}>{s.email}</ContactLine>
            )}
            {s?.address && (
              <ContactLine icon={<MapPin size={14} />}>{s.address}</ContactLine>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-navy-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            © {year} {name}. Developed by{' '}
            <a href="https://www.linkedin.com/in/jobaidazim/" target="_blank" rel="noopener noreferrer"
               className="text-navy-100/60 hover:text-white transition">
              Jobaid Azim
            </a>
            . All rights reserved.
          </span>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-white transition">About</Link>
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, className = '' }: { title: string; links: [string, string][]; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs font-bold uppercase tracking-[0.15em] text-accent-400 mb-4">{title}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map(([l, to]) => (
          <li key={to}>
            <Link to={to} className="text-navy-100/80 hover:text-white transition inline-flex items-center gap-1 group">
              {l}
              <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition text-accent-400">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 text-navy-100/80 hover:bg-accent-500 hover:ring-accent-500 hover:text-white transition">
      {children}
    </a>
  );
}

function ContactLine({
  icon, href, children,
}: { icon: React.ReactNode; href?: string; children: React.ReactNode }) {
  const inner = (
    <span className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 text-accent-400">
        {icon}
      </span>
      <span className="pt-0.5">{children}</span>
    </span>
  );
  if (!href) return <li className="text-navy-100/85">{inner}</li>;
  return (
    <li>
      <a href={href} className="text-navy-100/85 hover:text-white transition">{inner}</a>
    </li>
  );
}
