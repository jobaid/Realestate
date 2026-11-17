import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { getFavorites, subscribe, clearFavorites } from '../lib/favorites';
import { getPropertiesByIds } from '../lib/publicApi';
import type { Property } from '../types';
import PropertyCard from '../components/PropertyCard';
import { useHead } from '../lib/head';

export default function Favorites() {
  useHead({ title: 'Favorites', description: 'Your saved properties.', robots: 'noindex,follow' });
  const [ids, setIds] = useState<string[]>(() => getFavorites());
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribe(() => setIds(getFavorites())), []);
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    getPropertiesByIds(ids).then((xs) => {
      if (!cancel) {
        setItems(xs);
        setLoading(false);
      }
    });
    return () => { cancel = true; };
  }, [ids]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-navy-900 inline-flex items-center gap-2">
          <Heart className="text-red-500 fill-red-500" size={26} /> Favorites
        </h1>
        {ids.length > 0 && (
          <button onClick={() => { if (confirm('Clear all favorites?')) clearFavorites(); }}
            className="text-sm text-navy-500 hover:text-navy-900 underline underline-offset-2">
            Clear all
          </button>
        )}
      </div>

      {ids.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-navy-100 p-10 text-center">
          <p className="text-navy-600">You haven't saved any properties yet.</p>
          <p className="text-sm text-navy-500 mt-1">Tap the heart on any listing to save it here.</p>
          <Link to="/buy" className="mt-5 inline-block rounded-lg bg-navy-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-navy-800">
            Browse homes for sale
          </Link>
        </div>
      ) : loading ? (
        <p className="text-navy-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-navy-500">
          Saved properties are no longer available. They may have been sold or removed.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
