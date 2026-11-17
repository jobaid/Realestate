import { MouseEvent, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { isFavorite, toggleFavorite, subscribe } from '../lib/favorites';

interface Props {
  propertyId: string;
  size?: number;
  floating?: boolean;
}

export default function FavoriteButton({ propertyId, size = 18, floating }: Props) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    setFav(isFavorite(propertyId));
    return subscribe(() => setFav(isFavorite(propertyId)));
  }, [propertyId]);

  function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFav(toggleFavorite(propertyId));
  }

  const base = 'inline-flex items-center justify-center rounded-full transition';
  const cls = floating
    ? `${base} absolute top-3 right-3 h-9 w-9 bg-white/90 backdrop-blur hover:bg-white shadow`
    : `${base} h-10 w-10 bg-white ring-1 ring-navy-100 hover:bg-navy-50`;

  return (
    <button type="button" onClick={onClick} aria-pressed={fav}
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'} className={cls}>
      <Heart size={size} className={fav ? 'fill-red-500 text-red-500' : 'text-navy-600'} />
    </button>
  );
}
