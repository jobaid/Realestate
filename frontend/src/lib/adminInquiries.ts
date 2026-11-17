import { adminApi } from './auth';

export interface AdminInquiry {
  id: string;
  property_id?: string | null;
  property_title?: string | null;
  property_slug?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: 'new' | 'in_progress' | 'responded' | 'archived' | 'spam';
  source: 'property' | 'contact';
  admin_notes?: string | null;
  responded_at?: string | null;
  created_at: string;
}

export interface InquiryListResponse {
  data: AdminInquiry[];
  total: number;
  unread: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function listInquiries(params: Record<string, string | number | undefined>) {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') clean[k] = String(v); });
  const { data } = await adminApi.get<InquiryListResponse>('/admin/inquiries', { params: clean });
  return data;
}

export async function getInquiry(id: string) {
  const { data } = await adminApi.get<AdminInquiry>(`/admin/inquiries/${id}`);
  return data;
}

export async function updateInquiry(id: string, patch: { status?: string; admin_notes?: string }) {
  await adminApi.patch(`/admin/inquiries/${id}`, patch);
}

export async function deleteInquiry(id: string) {
  await adminApi.delete(`/admin/inquiries/${id}`);
}

export async function unreadInquiries(): Promise<number> {
  const r = await listInquiries({ status: 'new', page_size: 1 });
  return r.total;
}
