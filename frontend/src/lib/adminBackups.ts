import { adminApi, getAccessToken } from './auth';

export interface BackupRow {
  id: string;
  filename: string;
  size_bytes: number;
  kind: 'manual' | 'auto' | 'pre_restore';
  status: 'running' | 'ready' | 'failed';
  error?: string | null;
  created_at: string;
}

export async function listBackups() {
  const { data } = await adminApi.get<{ data: BackupRow[] }>('/admin/backups');
  return data.data;
}

export async function createBackup() {
  const { data } = await adminApi.post<BackupRow>('/admin/backups');
  return data;
}

export async function deleteBackup(id: string) {
  await adminApi.delete(`/admin/backups/${id}`);
}

export function backupDownloadURL(id: string) {
  // The <a download> needs the full URL with the Authorization header —
  // we can't use the download attribute with headers, so we add a short-lived
  // token in the URL. Easier: use fetch + blob.
  const base = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
  return `${base}/admin/backups/${id}/download`;
}

export async function downloadBackup(id: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(backupDownloadURL(id), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function restoreFromExisting(id: string) {
  await adminApi.post(`/admin/backups/restore?id=${encodeURIComponent(id)}`);
}

export async function restoreFromUpload(file: File) {
  const form = new FormData();
  form.append('file', file);
  await adminApi.post('/admin/backups/restore', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30 * 60_000,
  });
}
