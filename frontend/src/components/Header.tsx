import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Heart, Menu, X } from 'lucide-react';
import { getFavorites, subscribe } from '../lib/favorites';
import { getPublicSettings } from '../lib/adminSettings';

const navLink = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium transition ${isActive ? 'text-accent-700' : 'text-navy-700 hover:text-navy-900'}`;

const mobileNavLink = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-4 py-3 text-base font-semibold transition ${
    isActive ? 'bg-accent-50 text-accent-700' : 'text-navy-800 hover:bg-navy-50'
  }`;

export default function Header() {
  const [favCount, setFavCount] = useState(() => getFavorites().length);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { data: s } = useQuery({ queryKey: ['public-settings'], queryFn: getPublicSettings, staleTime: 5 * 60_000 });

  useEffect(() => subscribe(() => setFavCount(getFavorites().length)), []);
  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [loc.pathname]);
  // Lock body scroll when mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-navy-100">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          {s?.logo_url ? (
            <img src={s.logo_url} alt={s.company_name || 'Logo'}
              className="h-10 sm:h-11 w-auto object-contain" style={{ maxWidth: 200 }} />
          ) : (
            <>
              <Home className="text-accent-600" size={22} />
              <span className="font-display font-bold text-lg sm:text-xl tracking-tight">
                {s?.company_name || 'NUR Realty'}
              </span>
            </>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center">
          <NavLink to="/" end className={navLink}>Home</NavLink>
          <NavLink to="/buy" className={navLink}>Buy</NavLink>
          <NavLink to="/rent" className={navLink}>Rent</NavLink>
          <NavLink to="/sold" className={navLink}>Sold</NavLink>
          <NavLink to="/about" className={navLink}>About</NavLink>
          <NavLink to="/contact" className={navLink}>Contact</NavLink>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
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
            className="hidden sm:inline-flex items-center rounded-lg bg-navy-900 text-white px-3 lg:px-4 py-2 text-sm font-semibold hover:bg-navy-800 whitespace-nowrap">
            Contact Agent
          </Link>

          {/* Mobile menu button */}
          <button type="button" onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-navy-50 text-navy-800">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            className="md:hidden fixed inset-0 top-16 bg-navy-900/40 backdrop-blur-sm z-40"
            aria-hidden="true" />
          <div className="md:hidden fixed left-0 right-0 top-16 bg-white border-b border-navy-100 shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="px-4 py-3 space-y-1">
              <NavLink to="/" end className={mobileNavLink}>Home</NavLink>
              <NavLink to="/buy" className={mobileNavLink}>Buy</NavLink>
              <NavLink to="/rent" className={mobileNavLink}>Rent</NavLink>
              <NavLink to="/sold" className={mobileNavLink}>Sold</NavLink>
              <NavLink to="/favorites" className={mobileNavLink}>
                Favorites{favCount > 0 && <span className="ml-2 text-xs text-accent-700">({favCount})</span>}
              </NavLink>
              <NavLink to="/about" className={mobileNavLink}>About</NavLink>
              <NavLink to="/contact" className={mobileNavLink}>Contact</NavLink>
              <Link to="/contact"
                className="mt-3 block text-center rounded-lg bg-navy-900 text-white px-4 py-3 text-sm font-semibold hover:bg-navy-800">
                Contact Agent
              </Link>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
