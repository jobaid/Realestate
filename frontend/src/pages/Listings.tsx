import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { listProperties, listSold } from '../api';
import { useHead } from '../lib/head';

interface Props { mode: 'buy' | 'rent' | 'sold' }

export default function Listings({ mode }: Props) {
  const [params, setParams] = useSearchParams();

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
    // Filtered views aren't canonical duplicates of the base listing page.
    robots: Array.from(params.keys()).some((k) => k !== 'page') ? 'noindex,follow' : 'index,follow',
  });

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    next.delete('page');
    setParams(next);
  };

  const inp = 'w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{title}</h1>
      <p className="text-navy-500 mb-8">{q.data?.total ?? 0} properties</p>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {mode !== 'sold' && (
          <aside className="h-fit rounded-2xl bg-white ring-1 ring-navy-100 p-5 space-y-4">
            <Field label="City">
              <input className={inp} defaultValue={filters.city ?? ''} onBlur={e => setFilter('city', e.target.value)} />
            </Field>
            <Field label="ZIP code">
              <input className={inp} defaultValue={filters.zip_code ?? ''} onBlur={e => setFilter('zip_code', e.target.value)} />
            </Field>
            <Field label="Property type">
              <select className={inp} value={filters.property_type ?? ''} onChange={e => setFilter('property_type', e.target.value)}>
                <option value="">Any</option>
                {['house','apartment','condo','townhouse','commercial','land'].map(t => (
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
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
              </select>
            </Field>
            <Field label="Bathrooms (min)">
              <select className={inp} value={filters.bathrooms ?? ''} onChange={e => setFilter('bathrooms', e.target.value)}>
                <option value="">Any</option>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n}+</option>)}
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
        )}

        <div>
          {q.isLoading ? <div className="text-navy-500">Loading…</div>
            : !q.data?.data?.length ? (
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
            ) : <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {q.data.data.map(p => <PropertyCard key={p.id} p={p} />)}
              </div>}

          {mode !== 'sold' && q.data && q.data.total_pages > 1 && (
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-navy-700 uppercase tracking-wide">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
