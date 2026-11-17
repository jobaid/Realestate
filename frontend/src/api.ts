import axios from 'axios';
import type { Property, PropertyListResponse } from './types';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({ baseURL, timeout: 10_000 });

export async function listProperties(params: Record<string, string | number | undefined>) {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') clean[k] = String(v); });
  const { data } = await api.get<PropertyListResponse>('/properties', { params: clean });
  return data;
}

export async function getProperty(slug: string) {
  const { data } = await api.get<Property>(`/properties/${slug}`);
  return data;
}

export async function listFeatured() {
  const { data } = await api.get<{ data: Property[] }>('/properties/featured');
  return data.data;
}

export async function listRecent() {
  const { data } = await api.get<{ data: Property[] }>('/properties/recent');
  return data.data;
}

export async function listSold() {
  const { data } = await api.get<{ data: Property[] }>('/properties/sold');
  return data.data;
}
