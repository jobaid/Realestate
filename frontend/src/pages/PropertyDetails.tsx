import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Bed, Bath, Ruler, Calendar, MapPin, Home } from 'lucide-react';
import { getProperty } from '../api';
import type { Property } from '../types';
import { priceFor, sqft, money } from '../lib/format';
import InquiryForm from '../components/InquiryForm';
import FavoriteButton from '../components/FavoriteButton';
import NotFoundProperty from '../components/NotFoundProperty';
import PropertyDetailsSkeleton from '../components/PropertyDetailsSkeleton';
import { useHead } from '../lib/head';
import { buildPropertyJsonLd } from '../lib/jsonld';

// The container only decides which of the three UIs to render. All hooks
// that depend on the loaded property live inside PropertyBody so their count
// stays stable regardless of loading state.
export default function PropertyDetails() {
  const { slug = '' } = useParams();
  const q = useQuery({
    queryKey: ['property', slug],
    queryFn: () => getProperty(slug),
    enabled: !!slug,
    retry: false,
  });

  if (q.isLoading) return <PropertyDetailsSkeleton />;
  if (q.isError || !q.data) return <NotFoundProperty slug={slug} />;
  return <PropertyBody p={q.data} />;
}

function PropertyBody({ p }: { p: Property }) {
  const [idx, setIdx] = useState(0);
  const images = Array.isArray(p.images) ? p.images : [];
  const main = images[idx] ?? images[0];
  const pic = images.find((i) => i.is_primary)?.url ?? images[0]?.url;

  useHead({
    title: p.title,
    description: (
      p.description ||
      `${p.property_type} in ${p.city}, ${p.state} — ${p.bedrooms} bd / ${p.bathrooms} ba.`
    ).slice(0, 300),
    image: pic,
    type: 'article',
    jsonLd: buildPropertyJsonLd(p, window.location.href),
  });

  return (
    <article className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <nav className="text-sm text-navy-500 mb-4">
        <Link to="/" className="hover:text-navy-900">Home</Link> ·{' '}
        <Link to={p.listing_type === 'rent' ? '/rent' : '/buy'} className="hover:text-navy-900">
          {p.listing_type === 'rent' ? 'Rentals' : 'Homes for Sale'}
        </Link>
      </nav>

      <div className="grid gap-2 sm:gap-3 md:grid-cols-4">
        <div className="md:col-span-3 md:row-span-2 aspect-[16/10] bg-navy-100 rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center text-navy-300">
          {main ? (
            <img src={main.url} alt={p.title} className="w-full h-full object-cover" />
          ) : (
            <Home size={48} />
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-1 md:col-span-1 md:row-span-2 gap-2 sm:gap-3">
            {images.slice(0, 4).map((img, i) => (
              <button key={img.id} onClick={() => setIdx(i)}
                className={`aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden ring-2 ${i === idx ? 'ring-accent-500' : 'ring-transparent'}`}>
                <img src={img.url} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 sm:mt-8 grid gap-8 lg:gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              p.status === 'sold' || p.status === 'rented'
                ? 'bg-red-600 text-white'
                : 'bg-accent-50 text-accent-700'
            }`}>
              {p.listing_type === 'rent'
                ? p.status === 'rented' ? 'Rented' : 'For Rent'
                : p.status === 'sold' ? 'Sold' : 'For Sale'}
            </span>
            {p.featured && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-900 text-white">Featured</span>}
            <span className="ml-auto"><FavoriteButton propertyId={p.id} /></span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-extrabold">{p.title}</h1>
          <div className="mt-2 text-sm sm:text-base text-navy-500 flex items-start gap-1.5">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span>{p.address}{p.unit_number ? `, ${p.unit_number}` : ''}, {p.city}, {p.state} {p.zip_code}</span>
          </div>
          <div className="mt-5 sm:mt-6 text-3xl sm:text-4xl font-extrabold text-navy-900">{priceFor(p)}</div>

          <dl className="mt-6 sm:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Stat Icon={Bed} label="Bedrooms" value={p.bedrooms} />
            <Stat Icon={Bath} label="Bathrooms" value={p.bathrooms} />
            <Stat Icon={Ruler} label="Area" value={sqft(p.square_feet)} />
            <Stat Icon={Calendar} label="Year built" value={p.year_built ?? '—'} />
            <Stat Icon={Home} label="Type" value={p.property_type} />
            <Stat Icon={Home} label="Garage" value={`${p.garage_spaces} spaces`} />
            {p.lot_size ? <Stat Icon={Ruler} label="Lot" value={`${p.lot_size} sqft`} /> : null}
            {p.sold_date ? <Stat Icon={Calendar} label="Sold" value={new Date(p.sold_date).toLocaleDateString()} /> : null}
          </dl>

          {p.description && (
            <section className="mt-10">
              <h2 className="text-xl font-bold mb-3">About this property</h2>
              <p className="text-navy-700 leading-relaxed whitespace-pre-line">{p.description}</p>
            </section>
          )}

          {p.sold_date && p.sold_price && (
            <section className="mt-8 rounded-2xl bg-navy-50 p-5 ring-1 ring-navy-100">
              <div className="font-semibold text-navy-900">Sale record</div>
              <div className="text-navy-700 mt-1">Sold for {money(p.sold_price)} on {new Date(p.sold_date).toLocaleDateString()}.</div>
            </section>
          )}
        </div>

        <aside className="h-fit rounded-2xl bg-white ring-1 ring-navy-100 shadow-card p-6 lg:sticky lg:top-24">
          <div className="font-bold text-lg mb-1">Request a showing</div>
          <p className="text-sm text-navy-500 mb-4">Send a message about this property and we'll respond shortly.</p>
          <InquiryForm propertyId={p.id} compact
            defaultMessage={`Hi, I'm interested in "${p.title}" and would like to schedule a showing.`} />
        </aside>
      </div>
    </article>
  );
}

function Stat({ Icon, label, value }: { Icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-navy-100 p-4">
      <Icon size={18} className="text-accent-600" />
      <div className="mt-2 text-xs uppercase tracking-wide text-navy-500">{label}</div>
      <div className="text-navy-900 font-semibold">{value}</div>
    </div>
  );
}
