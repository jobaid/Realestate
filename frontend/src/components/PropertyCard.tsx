import { Link } from 'react-router-dom';
import { Bed, Bath, Ruler, MapPin } from 'lucide-react';
import type { Property } from '../types';
import { priceFor, sqft } from '../lib/format';
import FavoriteButton from './FavoriteButton';

const statusColor: Record<string, string> = {
  available: 'bg-accent-500',
  pending:   'bg-amber-500',
  sold:      'bg-navy-800',
  rented:    'bg-navy-800',
};

export default function PropertyCard({ p }: { p: Property }) {
  const cover = p.images.find(i => i.is_primary) ?? p.images[0];
  const badge = p.listing_type === 'rent' ? 'For Rent' : (p.status === 'sold' ? 'Sold' : 'For Sale');
  return (
    <Link to={`/property/${p.slug}`} className="group block rounded-2xl bg-white shadow-card overflow-hidden ring-1 ring-navy-100 hover:ring-navy-200 transition">
      <div className="relative aspect-[4/3] bg-navy-100 overflow-hidden">
        {cover ? (
          <img src={cover.url} alt={p.title} loading="lazy"
               className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
        ) : null}
        <span className={`absolute top-3 left-3 text-xs font-semibold text-white px-2.5 py-1 rounded-full ${statusColor[p.status] ?? 'bg-navy-800'}`}>
          {badge}
        </span>
        <FavoriteButton propertyId={p.id} floating />
      </div>
      <div className="p-5">
        <div className="text-xl font-bold text-navy-900">{priceFor(p)}</div>
        <h3 className="mt-1 text-[15px] font-semibold text-navy-800 line-clamp-1">{p.title}</h3>
        <div className="mt-1 text-sm text-navy-500 flex items-center gap-1">
          <MapPin size={14} /> <span className="line-clamp-1">{p.address}, {p.city}, {p.state} {p.zip_code}</span>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-navy-700">
          <span className="inline-flex items-center gap-1.5"><Bed size={15} />{p.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1.5"><Bath size={15} />{p.bathrooms} ba</span>
          <span className="inline-flex items-center gap-1.5"><Ruler size={15} />{sqft(p.square_feet)}</span>
        </div>
      </div>
    </Link>
  );
}
