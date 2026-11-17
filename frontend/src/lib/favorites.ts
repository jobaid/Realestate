// Client-side favorites: persists property ids in localStorage.
// Emits a 'favorites-changed' CustomEvent so components can refresh.

const KEY = 'ar_favorites';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent('favorites-changed'));
}

export function getFavorites(): string[] {
  return read();
}

export function isFavorite(id: string): boolean {
  return read().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const list = read();
  const i = list.indexOf(id);
  if (i >= 0) {
    list.splice(i, 1);
    write(list);
    return false;
  }
  list.push(id);
  write(list);
  return true;
}

export function clearFavorites() {
  write([]);
}

export function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener('favorites-changed', handler);
  window.addEventListener('storage', (e) => { if (e.key === KEY) handler(); });
  return () => window.removeEventListener('favorites-changed', handler);
}
