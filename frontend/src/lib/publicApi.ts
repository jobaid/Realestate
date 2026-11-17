import { api } from '../api';
import type { Property } from '../types';

export interface InquiryPayload {
  property_id?: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  source?: 'property' | 'contact';
}

export async function submitInquiry(p: InquiryPayload): Promise<{ id: string }> {
  const { data } = await api.post('/inquiries', p);
  return data;
}

export async function getPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (!ids.length) return [];
  // No bulk endpoint yet; fall back to recent/featured/sold and filter client-side.
  const [recent, featured, sold] = await Promise.all([
    api.get<{ data: Property[] }>('/properties/recent'),
    api.get<{ data: Property[] }>('/properties/featured'),
    api.get<{ data: Property[] }>('/properties/sold'),
  ]);
  const seen = new Map<string, Property>();
  [...recent.data.data, ...featured.data.data, ...sold.data.data].forEach((p) => seen.set(p.id, p));
  return ids.map((id) => seen.get(id)).filter((p): p is Property => !!p);
}
