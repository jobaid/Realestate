import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const LS_ACCESS = 'ar_access';
const LS_REFRESH = 'ar_refresh';
const LS_USER = 'ar_user';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export function getAccessToken() {
  return localStorage.getItem(LS_ACCESS);
}
export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(LS_USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}
export function isLoggedIn() {
  return !!getAccessToken();
}

function storeSession(access: string, refresh: string, user?: AuthUser) {
  localStorage.setItem(LS_ACCESS, access);
  localStorage.setItem(LS_REFRESH, refresh);
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(LS_ACCESS);
  localStorage.removeItem(LS_REFRESH);
  localStorage.removeItem(LS_USER);
}

export const adminApi = axios.create({ baseURL, timeout: 15_000 });

adminApi.interceptors.request.use((cfg) => {
  const t = getAccessToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(LS_REFRESH);
  if (!refresh) return false;
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refresh });
    storeSession(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

adminApi.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retried) {
      orig._retried = true;
      refreshing = refreshing ?? doRefresh();
      const ok = await refreshing;
      refreshing = null;
      if (ok) {
        orig.headers.Authorization = `Bearer ${getAccessToken()}`;
        return adminApi(orig);
      }
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  },
);

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await axios.post(`${baseURL}/auth/login`, { email, password });
  storeSession(data.access_token, data.refresh_token, data.user);
  return data.user as AuthUser;
}

export async function logout() {
  const refresh = localStorage.getItem(LS_REFRESH);
  try {
    if (refresh) await axios.post(`${baseURL}/auth/logout`, { refresh_token: refresh });
  } finally {
    clearSession();
  }
}
