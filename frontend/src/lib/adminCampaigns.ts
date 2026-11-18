import { adminApi } from './auth';

export interface CampaignRow {
  id: string;
  subject: string;
  body_html?: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sent_count: number;
  failed_count: number;
  total_targets: number;
  sent_at?: string | null;
  created_at: string;
  last_error?: string | null;
}

export async function listCampaigns() {
  const { data } = await adminApi.get<{ data: CampaignRow[] }>('/admin/campaigns');
  return data.data;
}

export async function getCampaign(id: string) {
  const { data } = await adminApi.get<CampaignRow>(`/admin/campaigns/${id}`);
  return data;
}

export async function createCampaign(p: { subject: string; body_html: string }) {
  const { data } = await adminApi.post<{ id: string }>('/admin/campaigns', p);
  return data;
}

export async function updateCampaign(id: string, p: { subject: string; body_html: string }) {
  await adminApi.put(`/admin/campaigns/${id}`, p);
}

export async function deleteCampaign(id: string) {
  await adminApi.delete(`/admin/campaigns/${id}`);
}

export async function sendCampaign(id: string) {
  const { data } = await adminApi.post<{ ok: boolean; targets: number }>(`/admin/campaigns/${id}/send`);
  return data;
}
