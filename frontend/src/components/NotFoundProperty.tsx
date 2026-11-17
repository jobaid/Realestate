import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { listFeatured } from '../api';
import PropertyCard from './PropertyCard';
import { useHead } from '../lib/head';

export default function NotFoundProperty({ slug }: { slug: string }) {
  useHead({
    title: 'Property not found',
    description: "That listing isn't available anymore — browse current homes.",
    robots: 'noindex,follow',
  });

  const featured = useQuery({ queryKey: ['featured'], queryFn: listFeatured });

  return (
    <>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="absolute inset-0 -z-10 opacity-30">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920"
               alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-900/90 to-accent-900/40" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 mb-6">
            <Home className="text-accent-500" size={36} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400 mb-3">404 · Listing unavailable</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            We couldn't find that property
          </h1>
          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            The listing at <code className="font-mono text-sm bg-white/10 px-1.5 py-0.5 rounded">/property/{slug}</code>{' '}
            doesn't exist, or it has been sold, rented, or removed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/buy"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold px-5 py-3">
              <Search size={16} /> Browse homes for sale
            </Link>
            <Link to="/rent"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3">
              Browse rentals
            </Link>
            <Link to="/"
              className="inline-flex items-center gap-2 rounded-lg text-white/80 hover:text-white font-semibold px-3 py-3">
              <ArrowLeft size={16} /> Back to home
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-navy-900">You might like these instead</h2>
            <p className="text-navy-500 mt-1 text-sm">Featured listings on the market right now.</p>
          </div>
          <Link to="/buy" className="hidden sm:inline text-accent-700 font-semibold text-sm hover:underline">
            View all →
          </Link>
        </div>
        {featured.isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl bg-navy-100 animate-pulse aspect-[4/3]" />
            ))}
          </div>
        ) : featured.data && featured.data.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.slice(0, 3).map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        ) : (
          <p className="text-navy-500 text-sm">No featured listings available right now.</p>
        )}
      </section>
    </>
  );
}
