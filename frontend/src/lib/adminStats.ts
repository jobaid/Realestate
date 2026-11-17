import { adminApi } from './auth';

export interface Stats {
  properties: {
    total: number;
    available: number;
    pending: number;
    sold: number;
    rented: number;
    draft: number;
    off_market: number;
    featured: number;
    published: number;
    value_active: number;
  };
  inquiries: {
    total: number;
    new: number;
    last_7d: number;
    last_30d: number;
  };
}

export interface DailyPoint { date: string; count: number; }

export interface ActivityRow {
  action: string;
  entity: string | null;
  entity_id: string | null;
  user_email: string | null;
  created_at: string;
}

export async function getStats(): Promise<Stats> {
  const { data } = await adminApi.get<Stats>('/admin/stats');
  return data;
}

export async function getInquiriesDaily(): Promise<DailyPoint[]> {
  const { data } = await adminApi.get<{ data: DailyPoint[] }>('/admin/stats/inquiries-daily');
  return data.data;
}

export async function getRecentActivity(): Promise<ActivityRow[]> {
  const { data } = await adminApi.get<{ data: ActivityRow[] }>('/admin/stats/recent-activity');
  return data.data;
}
