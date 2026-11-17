import { adminApi } from './auth';
import { api } from '../api';

export interface SiteSettings {
  company_name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}

export async function getAdminSettings(): Promise<SiteSettings> {
  const { data } = await adminApi.get<SiteSettings>('/admin/settings');
  return data;
}

export async function updateSettings(s: SiteSettings) {
  await adminApi.put('/admin/settings', s);
}

export async function getPublicSettings(): Promise<SiteSettings> {
  const { data } = await api.get<SiteSettings>('/settings');
  return data;
}
