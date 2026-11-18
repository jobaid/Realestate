import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { getPublicSettings } from '../lib/adminSettings';

export default function Footer() {
  const { data: s } = useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    staleTime: 5 * 60_000,
  });

  const name = s?.company_name || 'NUR Realty';
  const tagline = s?.tagline || 'Helping families find the right home.';

  return (
    <footer className="mt-24 bg-navy-900 text-navy-100">
      <div className="mx-auto max-w-7xl px-4 py-14 grid gap-10 md:grid-cols-4">
        <div>
          {s?.logo_url ? (
            <img src={s.logo_url} alt={name}
              className="h-16 w-auto object-contain mb-3" style={{ maxWidth: 240 }} />
          ) : (
            <div className="font-display font-bold text-white text-xl">{name}</div>
          )}
          <p className="mt-3 text-sm text-navy-100/70">{tagline}</p>
          {(s?.facebook_url || s?.instagram_url || s?.twitter_url) && (
            <div className="mt-4 flex gap-3">
              {s.facebook_url && <a href={s.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="text-navy-100/70 hover:text-white"><Facebook size={18} /></a>}
              {s.instagram_url && <a href={s.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram"
                className="text-navy-100/70 hover:text-white"><Instagram size={18} /></a>}
              {s.twitter_url && <a href={s.twitter_url} target="_blank" rel="noreferrer" aria-label="Twitter"
                className="text-navy-100/70 hover:text-white"><Twitter size={18} /></a>}
            </div>
          )}
        </div>
        <FooterCol title="Explore" links={[['Buy', '/buy'], ['Rent', '/rent'], ['Sold', '/sold']]} />
        <FooterCol title="Company" links={[['About', '/about'], ['Contact', '/contact']]} />
        <div>
          <div className="font-semibold text-white mb-3">Contact</div>
          <ul className="space-y-1.5 text-sm text-navy-100/70">
            {s?.phone && <li><a className="hover:text-white" href={`tel:${s.phone}`}>{s.phone}</a></li>}
            {s?.email && <li><a className="hover:text-white" href={`mailto:${s.email}`}>{s.email}</a></li>}
            {s?.address && <li>{s.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-navy-100/60 flex flex-col sm:flex-row sm:justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {name}. Developed by{' '}
            <a href="https://www.linkedin.com/in/jobaidazim/" target="_blank" rel="noopener noreferrer"
               className="text-navy-100/60 hover:text-white transition">
              Jobaid Azim
            </a>
            . All rights reserved.
          </span>
          <span>Built for the modern homeowner.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-semibold text-white mb-3">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, to]) => (
          <li key={to}><Link className="hover:text-white" to={to}>{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
