import { api } from '../api';
import { adminApi } from './auth';
import type { SiteSettings } from './adminSettings';

export interface DigitalIDInfo {
  enabled: string;
  first_name: string;
  last_name: string;
  title: string;
  organization: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  note: string;
  photo_url: string;
  linkedin: string;
  facebook: string;
  instagram: string;
}

export async function getDigitalID(): Promise<DigitalIDInfo> {
  const { data } = await api.get<DigitalIDInfo>('/digital-id');
  return data;
}

export async function getAdminDigitalID(): Promise<SiteSettings> {
  const { data } = await adminApi.get<SiteSettings>('/admin/settings');
  return data;
}

export async function saveDigitalID(patch: Partial<SiteSettings>) {
  await adminApi.put('/admin/settings', patch);
}
