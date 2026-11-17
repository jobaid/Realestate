import { Link } from 'react-router-dom';
import { Bed, Bath, Ruler, MapPin, CheckCircle2 } from 'lucide-react';
import type { Property } from '../types';
import { sqft, money } from '../lib/format';

export default function SoldCard({ p }: { p: Property }) {
  const cover = p.images.find((i) => i.is_primary) ?? p.images[0];
  const soldFor = p.sold_price ?? p.sale_price ?? null;
  const asked = p.sale_price;
  const dropped = soldFor && asked && asked > soldFor;
  const premium = soldFor && asked && asked < soldFor;

  return (
    <Link to={`/property/${p.slug}`}
      className="group block rounded-2xl bg-white shadow-card overflow-hidden ring-1 ring-navy-100 hover:ring-navy-300 transition">
      <div className="relative aspect-[4/3] bg-navy-100 overflow-hidden">
        {cover ? (
          <img src={cover.url} alt={p.title} loading="lazy"
               className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-navy-300">No photo</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-navy-900 text-white text-xs font-bold px-2.5 py-1 rounded-full tracking-wide">
          <CheckCircle2 size={14} /> SOLD
        </div>
        {p.sold_date && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur text-navy-900 text-xs font-semibold px-2.5 py-1 rounded-full">
            {new Date(p.sold_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-white/75">Sold for</div>
          <div className="text-2xl md:text-3xl font-extrabold leading-tight">
            {soldFor != null ? money(soldFor) : '—'}
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-[15px] font-semibold text-navy-900 line-clamp-1">{p.title}</h3>
        <div className="mt-1 text-sm text-navy-500 flex items-center gap-1">
          <MapPin size={14} /> <span className="line-clamp-1">{p.address}, {p.city}, {p.state} {p.zip_code}</span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-navy-700">
          <span className="inline-flex items-center gap-1.5"><Bed size={15} />{p.bedrooms} bd</span>
          <span className="inline-flex items-center gap-1.5"><Bath size={15} />{p.bathrooms} ba</span>
          <span className="inline-flex items-center gap-1.5"><Ruler size={15} />{sqft(p.square_feet)}</span>
        </div>
        {(dropped || premium) && asked != null && soldFor != null && (
          <div className="mt-3 text-xs text-navy-500">
            Listed at {money(asked)}
            <span className={`ml-2 font-semibold ${dropped ? 'text-red-600' : 'text-emerald-700'}`}>
              {dropped ? '↓' : '↑'} {money(Math.abs(asked - soldFor))} ({((Math.abs(asked - soldFor) / asked) * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
