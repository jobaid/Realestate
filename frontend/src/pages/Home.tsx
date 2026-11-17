import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, Compass, Users } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import PropertyCard from '../components/PropertyCard';
import { listFeatured, listRecent } from '../api';
import { useHead } from '../lib/head';

export default function Home() {
  const featured = useQuery({ queryKey: ['featured'], queryFn: listFeatured });
  const recent = useQuery({ queryKey: ['recent'], queryFn: listRecent });

  useHead({
    title: 'Find Your Perfect Place to Call Home',
    description: 'Discover beautifully-listed homes for sale and rent across Massachusetts, matched to the way you live.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: 'NUR Realty',
      url: window.location.origin,
      areaServed: 'Massachusetts',
    },
  });

  return (
    <>
      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920"
               alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/50 to-navy-900/30" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
          <h1 className="text-white text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
            Find Your Perfect Place to Call Home.
          </h1>
          <p className="mt-5 text-white/80 max-w-xl text-lg">
            Discover beautifully-listed homes for sale and rent across Massachusetts, matched to the way you live.
          </p>
          <div className="mt-10 max-w-4xl"><SearchBar /></div>
        </div>
      </section>

      <Section title="Featured Properties" subtitle="Hand-picked listings from our team">
        <Grid items={featured.data} loading={featured.isLoading} empty="No featured properties yet." />
      </Section>

      <Section title="Explore by Category">
        <div className="grid gap-4 md:grid-cols-6 grid-cols-2">
          {[
            ['House','house'], ['Apartment','apartment'], ['Condo','condo'],
            ['Townhouse','townhouse'], ['Commercial','commercial'], ['Land','land']
          ].map(([label, type]) => (
            <Link key={type} to={`/buy?property_type=${type}`}
              className="rounded-xl bg-navy-50 hover:bg-accent-50 ring-1 ring-navy-100 px-4 py-6 text-center font-semibold text-navy-800 transition">
              {label}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Recently Added" subtitle="Freshly listed homes you shouldn't miss">
        <Grid items={recent.data} loading={recent.isLoading} empty="No listings yet." />
      </Section>

      <Section title="Why Choose Azim Realty">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            [ShieldCheck, 'Verified Listings', 'Every property is reviewed before it goes live.'],
            [BadgeCheck, 'Professional Service', 'Agents who answer the phone and know the market.'],
            [Compass, 'Easy Search', 'Find the home that fits in under a minute.'],
            [Users, 'Experienced Team', 'Decades of Boston-area experience behind every deal.'],
          ].map(([Icon, title, body], i) => (
            <div key={i} className="rounded-2xl bg-white ring-1 ring-navy-100 shadow-card p-6">
              <Icon className="text-accent-600" />
              <div className="mt-4 font-semibold text-navy-900">{title as string}</div>
              <p className="mt-1 text-sm text-navy-500">{body as string}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className="mx-auto max-w-7xl px-4 my-24">
        <div className="rounded-3xl bg-navy-900 text-white p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-white text-3xl md:text-4xl font-extrabold">Ready to find your dream home?</h2>
            <p className="mt-3 text-white/70 max-w-xl">Talk to a local agent today. No pressure, no spam.</p>
          </div>
          <Link to="/contact" className="inline-flex rounded-lg bg-accent-500 hover:bg-accent-600 px-6 py-3 font-semibold">
            Contact our team
          </Link>
        </div>
      </section>
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 mt-20">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold">{title}</h2>
          {subtitle && <p className="mt-1 text-navy-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Grid({ items, loading, empty }: { items?: any[]; loading: boolean; empty: string }) {
  if (loading) return <GridSkeleton />;
  if (!items || items.length === 0) return <div className="text-navy-500 py-12">{empty}</div>;
  return (
    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
      {items.map(p => <PropertyCard key={p.id} p={p} />)}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white ring-1 ring-navy-100 overflow-hidden">
          <div className="aspect-[4/3] bg-navy-100 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-24 bg-navy-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-navy-100 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-navy-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
