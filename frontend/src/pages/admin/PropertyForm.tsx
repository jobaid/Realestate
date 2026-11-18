import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import {
  adminCreateProperty, adminGetProperty, adminUpdateProperty, adminUploadImage,
  type PropertyPayload,
} from '../../lib/adminApi';

const empty: PropertyPayload = {
  title: '', description: '', listing_type: 'sale', property_type: 'house',
  status: 'draft', sale_price: null, monthly_rent: null, address: '',
  city: '', state: '', zip_code: '', country: 'USA',
  bedrooms: 0, bathrooms: 0, half_bathrooms: 0, garage_spaces: 0,
  square_feet: null, lot_size: null, year_built: null,
  featured: false, publish: false, image_urls: [],
};

const field = 'w-full rounded-lg border border-navy-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 bg-white';
const label = 'block text-sm font-medium text-navy-700 mb-1';

export default function PropertyForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = !!id;
  const [form, setForm] = useState<PropertyPayload>(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: existing } = useQuery({
    queryKey: ['admin-prop', id],
    queryFn: () => adminGetProperty(id!),
    enabled: editing,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title,
      description: existing.description,
      listing_type: existing.listing_type,
      property_type: existing.property_type,
      status: existing.status,
      sale_price: existing.sale_price ?? null,
      monthly_rent: existing.monthly_rent ?? null,
      address: existing.address,
      unit_number: existing.unit_number ?? null,
      city: existing.city,
      state: existing.state,
      zip_code: existing.zip_code,
      neighborhood: existing.neighborhood ?? null,
      country: existing.country,
      bedrooms: existing.bedrooms,
      bathrooms: existing.bathrooms,
      half_bathrooms: existing.half_bathrooms,
      square_feet: existing.square_feet ?? null,
      lot_size: existing.lot_size ?? null,
      year_built: existing.year_built ?? null,
      garage_spaces: existing.garage_spaces,
      featured: existing.featured,
      publish: !!existing.published_at,
      image_urls: existing.images.map((i) => i.url),
    });
  }, [existing]);

  const set = <K extends keyof PropertyPayload>(k: K, v: PropertyPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string): number | null => (v === '' ? null : Number(v));

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      for (const f of Array.from(files)) {
        const url = await adminUploadImage(f);
        setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, url] }));
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Image upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.listing_type === 'sale' && form.sale_price == null) {
      setError('Sale price is required for sale listings.');
      return;
    }
    if (form.listing_type === 'rent' && form.monthly_rent == null) {
      setError('Monthly rent is required for rental listings.');
      return;
    }
    setBusy(true);
    try {
      if (editing) await adminUpdateProperty(id!, form);
      else await adminCreateProperty(form);
      nav('/admin');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-5">
        {editing ? 'Edit property' : 'New property'}
      </h1>
      <form onSubmit={onSubmit} className="space-y-6 bg-white rounded-xl border border-navy-100 p-6">
        <div>
          <label className={label}>Title *</label>
          <input className={field} required minLength={3} value={form.title}
            onChange={(e) => set('title', e.target.value)} />
        </div>
        <div>
          <label className={label}>Description</label>
          <textarea className={field} rows={4} value={form.description}
            onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Listing type *</label>
            <select className={field} value={form.listing_type} onChange={(e) => set('listing_type', e.target.value)}>
              <option value="sale">Sale</option><option value="rent">Rent</option>
            </select>
          </div>
          <div>
            <label className={label}>Property type *</label>
            <select className={field} value={form.property_type} onChange={(e) => set('property_type', e.target.value)}>
              {['house', 'apartment', 'condo', 'townhouse', 'commercial', 'land'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Status *</label>
            <select className={field} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['draft', 'available', 'pending', 'sold', 'rented', 'off_market'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {form.listing_type === 'sale' ? (
            <div>
              <label className={label}>Sale price (USD) *</label>
              <input type="number" min={0} className={field} value={form.sale_price ?? ''}
                onChange={(e) => set('sale_price', num(e.target.value))} />
            </div>
          ) : (
            <div>
              <label className={label}>Monthly rent (USD) *</label>
              <input type="number" min={0} className={field} value={form.monthly_rent ?? ''}
                onChange={(e) => set('monthly_rent', num(e.target.value))} />
            </div>
          )}
          <div>
            <label className={label}>Year built</label>
            <input type="number" className={field} value={form.year_built ?? ''}
              onChange={(e) => set('year_built', num(e.target.value))} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Address *</label>
            <input className={field} required value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <label className={label}>Unit number</label>
            <input className={field} value={form.unit_number ?? ''}
              onChange={(e) => set('unit_number', e.target.value || null)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>City *</label>
            <input className={field} required value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <label className={label}>State *</label>
            <input className={field} required value={form.state} onChange={(e) => set('state', e.target.value)} />
          </div>
          <div>
            <label className={label}>ZIP *</label>
            <input className={field} required value={form.zip_code} onChange={(e) => set('zip_code', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className={label}>Beds</label>
            <input type="number" min={0} className={field} value={form.bedrooms}
              onChange={(e) => set('bedrooms', Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Baths</label>
            <input type="number" min={0} step={0.5} className={field} value={form.bathrooms}
              onChange={(e) => set('bathrooms', Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Half baths</label>
            <input type="number" min={0} className={field} value={form.half_bathrooms}
              onChange={(e) => set('half_bathrooms', Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Garage</label>
            <input type="number" min={0} className={field} value={form.garage_spaces}
              onChange={(e) => set('garage_spaces', Number(e.target.value))} />
          </div>
          <div>
            <label className={label}>Sq ft</label>
            <input type="number" min={0} className={field} value={form.square_feet ?? ''}
              onChange={(e) => set('square_feet', num(e.target.value))} />
          </div>
        </div>

        <div>
          <label className={label}>Photos</label>
          <div className="flex flex-wrap gap-3">
            {form.image_urls.map((u, i) => (
              <div key={u + i} className="relative group">
                <img src={u} alt="" className="h-24 w-32 object-cover rounded-lg border border-navy-100" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-navy-900/80 text-white rounded px-1.5 py-0.5">Primary</span>
                )}
                <button type="button" aria-label="Remove image"
                  onClick={() => set('image_urls', form.image_urls.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="h-24 w-32 rounded-lg border-2 border-dashed border-navy-200 flex flex-col items-center justify-center text-navy-400 hover:border-accent-500 hover:text-accent-600 disabled:opacity-50">
              <Upload size={18} />
              <span className="text-xs mt-1">{uploading ? 'Uploading…' : 'Add photo'}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden
              onChange={(e) => onFiles(e.target.files)} />
          </div>
          <p className="text-xs text-navy-400 mt-1">JPEG, PNG or WebP, max 8 MB each. First photo is the primary image.</p>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.publish} onChange={(e) => set('publish', e.target.checked)} />
            Published (visible on site)
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={busy}
            className="rounded-lg bg-navy-900 text-white px-5 py-2.5 text-sm font-semibold hover:bg-navy-800 disabled:opacity-60">
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create property'}
          </button>
          <button type="button" onClick={() => nav('/admin')}
            className="rounded-lg border border-navy-200 px-5 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
