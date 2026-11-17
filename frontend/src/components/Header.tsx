import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, Heart } from 'lucide-react';
import { getFavorites, subscribe } from '../lib/favorites';

const navLink = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium transition ${isActive ? 'text-accent-700' : 'text-navy-700 hover:text-navy-900'}`;

export default function Header() {
  const [favCount, setFavCount] = useState(() => getFavorites().length);
  useEffect(() => subscribe(() => setFavCount(getFavorites().length)), []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-navy-100">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Home className="text-accent-600" size={22} />
          <span className="font-display font-bold text-xl tracking-tight">Azim Realty</span>
        </Link>
        <nav className="hidden md:flex items-center">
          <NavLink to="/" end className={navLink}>Home</NavLink>
          <NavLink to="/buy" className={navLink}>Buy</NavLink>
          <NavLink to="/rent" className={navLink}>Rent</NavLink>
          <NavLink to="/sold" className={navLink}>Sold</NavLink>
          <NavLink to="/about" className={navLink}>About</NavLink>
          <NavLink to="/contact" className={navLink}>Contact</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/favorites" aria-label="Favorites"
            className="relative inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-navy-50 text-navy-700">
            <Heart size={18} className={favCount > 0 ? 'fill-red-500 text-red-500' : ''} />
            {favCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold bg-navy-900 text-white rounded-full h-4 min-w-4 px-1 inline-flex items-center justify-center">
                {favCount}
              </span>
            )}
          </Link>
          <Link to="/contact"
            className="hidden sm:inline-flex items-center rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800">
            Contact Agent
          </Link>
        </div>
      </div>
    </header>
  );
}
