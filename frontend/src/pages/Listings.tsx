import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, SlidersHorizontal, X } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import SoldCard from '../components/SoldCard';
import { listProperties, listSold } from '../api';
import { useHead } from '../lib/head';

interface Props { mode: 'buy' | 'rent' | 'sold' }

export default function Listings({ mode }: Props) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = {
    listing_type: mode === 'rent' ? 'rent' : (mode === 'buy' ? 'sale' : undefined),
    city: params.get('city') ?? undefined,
    zip_code: params.get('zip_code') ?? undefined,
    property_type: params.get('property_type') ?? undefined,
    min_price: params.get('min_price') ?? undefined,
    max_price: params.get('max_price') ?? undefined,
    bedrooms: params.get('bedrooms') ?? undefined,
    bathrooms: params.get('bathrooms') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: params.get('page') ?? undefined,
  };

  const q = useQuery({
    queryKey: ['listings', mode, filters],
    queryFn: () => mode === 'sold'
      ? listSold().then(data => ({ data, total: data.length, page: 1, page_size: data.length, total_pages: 1 }))
      : listProperties(filters as any),
  });

  const title = mode === 'buy' ? 'Homes for Sale' : mode === 'rent' ? 'Rentals' : 'Recently Sold';

  useHead({
    title,
    description: mode === 'buy'
      ? 'Browse homes for sale across Massachusetts. Filter by city, price, bedrooms and more.'
      : mode === 'rent'
      ? 'Find rentals that fit your life. Filter by neighborhood, price, and size.'
      : 'Explore recently sold homes — see what is moving in the Massachusetts market.',
    robots: Array.from(params.keys()).some((k) => k !== 'page') ? 'noindex,follow' : 'index,follow',
  });

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.delete('page');
    setParams(next);
  };

  const items = q.data?.data ?? [];
  const total = q.data?.total ?? 0;

  // ====== SOLD: dedicated full-width, no sidebar ======
  if (mode === 'sold') {
    return (
      <div>
        <section className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
          <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-accent-300">
              <CheckCircle2 size={14} /> Sales archive
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">Recently Sold Homes</h1>
            <p className="mt-3 text-white/70 max-w-2xl">
              See closed transactions from our portfolio — a snapshot of what's moving in the market
              and where values are landing in each neighborhood.
            </p>
            <div className="mt-6 text-sm text-white/60">
              <span className="text-white font-semibold">{total}</span> {total === 1 ? 'property' : 'properties'} sold
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10">
          {q.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-navy-100 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState mode="sold" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => <SoldCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== BUY / RENT: sidebar + grid ======
  const inp = 'w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';
  const activeFilterCount = Object.values(filters).filter((v) => v && v !== filters.listing_type).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="flex items-start sm:items-end justify-between gap-3 mb-6 sm:mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1">{title}</h1>
          <p className="text-sm sm:text-base text-navy-500">{total} {total === 1 ? 'property' : 'properties'}</p>
        </div>
        <button type="button" onClick={() => setFiltersOpen(true)}
          className="lg:hidden inline-flex items-center gap-2 rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold">
          <SlidersHorizontal size={16} /> Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent-500 text-white text-xs font-bold px-1.5 py-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[260px_1fr]">
        {/* Mobile overlay + drawer */}
        {filtersOpen && (
          <div onClick={() => setFiltersOpen(false)}
            className="lg:hidden fixed inset-0 bg-navy-900/50 z-40" aria-hidden="true" />
        )}
        <aside className={`${
          filtersOpen
            ? 'fixed inset-y-0 right-0 z-50 w-80 max-w-[90vw] overflow-y-auto shadow-xl'
            : 'hidden lg:block'
        } lg:static lg:shadow-none lg:w-auto h-fit rounded-none lg:rounded-2xl bg-white ring-0 lg:ring-1 lg:ring-navy-100 p-5 space-y-4`}>
          <div className="flex items-center justify-between lg:hidden -mt-1 mb-2">
            <span className="font-display font-bold text-lg">Filters</span>
            <button onClick={() => setFiltersOpen(false)} aria-label="Close filters"
              className="rounded-lg p-1.5 hover:bg-navy-50 text-navy-700">
              <X size={20} />
            </button>
          </div>
          <Field label="City">
            <input className={inp} defaultValue={filters.city ?? ''} onBlur={e => setFilter('city', e.target.value)} />
          </Field>
          <Field label="ZIP code">
            <input className={inp} defaultValue={filters.zip_code ?? ''} onBlur={e => setFilter('zip_code', e.target.value)} />
          </Field>
          <Field label="Property type">
            <select className={inp} value={filters.property_type ?? ''} onChange={e => setFilter('property_type', e.target.value)}>
              <option value="">Any</option>
              {['house', 'apartment', 'condo', 'townhouse', 'commercial', 'land'].map(t => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min price"><input className={inp} type="number" defaultValue={filters.min_price ?? ''} onBlur={e => setFilter('min_price', e.target.value)} /></Field>
            <Field label="Max price"><input className={inp} type="number" defaultValue={filters.max_price ?? ''} onBlur={e => setFilter('max_price', e.target.value)} /></Field>
          </div>
          <Field label="Bedrooms (min)">
            <select className={inp} value={filters.bedrooms ?? ''} onChange={e => setFilter('bedrooms', e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </Field>
          <Field label="Bathrooms (min)">
            <select className={inp} value={filters.bathrooms ?? ''} onChange={e => setFilter('bathrooms', e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </Field>
          <Field label="Sort">
            <select className={inp} value={filters.sort ?? ''} onChange={e => setFilter('sort', e.target.value)}>
              <option value="">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </Field>
        </aside>

        <div>
          {q.isLoading ? <div className="text-navy-500">Loading…</div>
            : items.length === 0 ? <EmptyState mode={mode} />
            : <div className="grid gap-5 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map(p => <PropertyCard key={p.id} p={p} />)}
              </div>}

          {q.data && q.data.total_pages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: q.data.total_pages }).map((_, i) => {
                const n = i + 1;
                const active = q.data!.page === n;
                return (
                  <button key={n} onClick={() => setFilter('page', String(n))}
                    className={`w-10 h-10 rounded-lg text-sm font-semibold ${active ? 'bg-navy-900 text-white' : 'bg-white ring-1 ring-navy-100 hover:bg-navy-50'}`}>
                    {n}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ mode }: { mode: 'buy' | 'rent' | 'sold' }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-navy-100 p-10 text-center">
      <p className="text-navy-600 font-medium">
        {mode === 'sold' ? 'No sold properties recorded yet.' : 'No properties match these filters.'}
      </p>
      <p className="text-sm text-navy-500 mt-1">
        {mode === 'sold'
          ? 'Recently closed deals will appear here once published.'
          : 'Try removing a filter or widening the price range.'}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-navy-700 uppercase tracking-wide">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
