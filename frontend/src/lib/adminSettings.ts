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
  // About page
  about_name?: string;
  about_title?: string;
  about_photo_url?: string;
  about_bio?: string;
  // Admin / SMTP (admin only)
  notify_email?: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_name?: string;
  smtp_from_address?: string;
  smtp_use_tls?: string;
}

export async function getAdminSettings(): Promise<SiteSettings> {
  const { data } = await adminApi.get<SiteSettings>('/admin/settings');
  return data;
}

export async function updateSettings(s: SiteSettings) {
  await adminApi.put('/admin/settings', s);
}

export async function sendSMTPTest(): Promise<{ sent_to: string }> {
  const { data } = await adminApi.post('/admin/settings/smtp-test');
  return data;
}

export async function getPublicSettings(): Promise<SiteSettings> {
  const { data } = await api.get<SiteSettings>('/settings');
  return data;
}
