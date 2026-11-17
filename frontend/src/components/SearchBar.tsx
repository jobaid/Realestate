import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function SearchBar() {
  const nav = useNavigate();
  const [q, setQ] = useState({ listing_type: 'sale', city: '', zip_code: '', max_price: '', bedrooms: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v) params.set(k, v); });
    nav(`/buy?${params.toString()}`);
  };

  const input = 'w-full rounded-lg border border-navy-100 bg-white px-3 py-3 text-sm placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-accent-500';

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white/95 shadow-card p-4 md:p-5 ring-1 ring-navy-100">
      <div className="flex gap-2 mb-3">
        {(['sale','rent'] as const).map(t => (
          <button key={t} type="button" onClick={() => setQ({ ...q, listing_type: t })}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${q.listing_type === t ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-700'}`}>
            {t === 'sale' ? 'Buy' : 'Rent'}
          </button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        <input className={`${input} md:col-span-2`} placeholder="City, neighborhood, or address"
               value={q.city} onChange={e => setQ({ ...q, city: e.target.value })} />
        <input className={input} placeholder="ZIP code" value={q.zip_code}
               onChange={e => setQ({ ...q, zip_code: e.target.value.replace(/\D/g, '').slice(0, 5) })} />
        <input className={input} type="number" min="0" placeholder="Max price"
               value={q.max_price} onChange={e => setQ({ ...q, max_price: e.target.value })} />
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold px-5 py-3">
          <Search size={18} /> Search
        </button>
      </div>
    </form>
  );
}
