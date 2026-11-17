import { adminApi } from './auth';
import type { Property, PropertyListResponse } from '../types';

export interface PropertyPayload {
  slug?: string;
  title: string;
  description: string;
  listing_type: string;
  property_type: string;
  status: string;
  sale_price?: number | null;
  monthly_rent?: number | null;
  address: string;
  unit_number?: string | null;
  city: string;
  state: string;
  zip_code: string;
  neighborhood?: string | null;
  country?: string;
  bedrooms: number;
  bathrooms: number;
  half_bathrooms: number;
  square_feet?: number | null;
  lot_size?: number | null;
  year_built?: number | null;
  garage_spaces: number;
  featured: boolean;
  publish: boolean;
  image_urls: string[];
}

export async function adminListProperties(params: Record<string, string | number | undefined>) {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') clean[k] = String(v); });
  const { data } = await adminApi.get<PropertyListResponse>('/admin/properties', { params: clean });
  return data;
}

export async function adminGetProperty(id: string) {
  const { data } = await adminApi.get<Property>(`/admin/properties/${id}`);
  return data;
}

export async function adminCreateProperty(payload: PropertyPayload) {
  const { data } = await adminApi.post<{ id: string; slug: string }>('/admin/properties', payload);
  return data;
}

export async function adminUpdateProperty(id: string, payload: PropertyPayload) {
  const { data } = await adminApi.put(`/admin/properties/${id}`, payload);
  return data;
}

export async function adminDeleteProperty(id: string) {
  await adminApi.delete(`/admin/properties/${id}`);
}

export async function adminPublish(id: string, publish: boolean) {
  await adminApi.post(`/admin/properties/${id}/${publish ? 'publish' : 'unpublish'}`);
}

export async function adminUploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await adminApi.post<{ url: string }>('/admin/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
