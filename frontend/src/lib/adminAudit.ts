import { adminApi } from './auth';

export interface AuditRow {
  id: number;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  ip_addr: string | null;
  created_at: string;
}

export interface AuditListResponse {
  data: AuditRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function listAudit(params: Record<string, string | number | undefined>) {
  const clean: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') clean[k] = String(v); });
  const { data } = await adminApi.get<AuditListResponse>('/admin/audit', { params: clean });
  return data;
}
