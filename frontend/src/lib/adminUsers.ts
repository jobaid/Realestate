import { adminApi } from './auth';

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'listing_manager';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export async function listUsers() {
  const { data } = await adminApi.get<{ data: AdminUserRow[] }>('/admin/users');
  return data.data;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: string;
}
export async function createUser(p: CreateUserPayload) {
  const { data } = await adminApi.post('/admin/users', p);
  return data;
}

export interface UpdateUserPayload {
  full_name?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}
export async function updateUser(id: string, p: UpdateUserPayload) {
  await adminApi.patch(`/admin/users/${id}`, p);
}

export async function deleteUser(id: string) {
  await adminApi.delete(`/admin/users/${id}`);
}

export async function changeOwnPassword(current_password: string, new_password: string) {
  await adminApi.post('/auth/me/password', { current_password, new_password });
}
