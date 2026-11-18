import { adminApi } from './auth';

export interface ContactRow {
  id: string;
  email: string;
  name: string;
  tags: string;
  source: string;
  unsubscribed: boolean;
  created_at: string;
}

export interface ContactListResponse {
  data: ContactRow[];
  total: number;
  subscribed: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function listContacts(params: Record<string, string | number | undefined>) {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') clean[k] = String(v); });
  const { data } = await adminApi.get<ContactListResponse>('/admin/contacts', { params: clean });
  return data;
}

export async function createContact(p: { email: string; name?: string; tags?: string }) {
  const { data } = await adminApi.post('/admin/contacts', p);
  return data;
}

export async function importContacts(p: { emails: string; tags?: string }) {
  const { data } = await adminApi.post<{ added: number; skipped: number }>('/admin/contacts/import', p);
  return data;
}

export async function updateContact(id: string, p: { name?: string; tags?: string; unsubscribed?: boolean }) {
  await adminApi.patch(`/admin/contacts/${id}`, p);
}

export async function deleteContact(id: string) {
  await adminApi.delete(`/admin/contacts/${id}`);
}
