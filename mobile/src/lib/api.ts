import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Absolute API origin. The web app proxies relative `/api` calls to Django,
 * but native has no dev proxy, so mobile always needs a full origin.
 * On a physical device/emulator this must point at the dev machine's LAN IP,
 * e.g. EXPO_PUBLIC_API_URL=http://192.168.1.10:8000.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? (typeof detail === 'string' ? detail : `Request failed (${status})`));
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

const ACCESS_KEY = 'eenp.access';
const REFRESH_KEY = 'eenp.refresh';

// expo-secure-store is native-only (Android/iOS/tvOS); fall back to
// localStorage on web so the Expo web target keeps working.
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

class Api {
  private access: string | null = null;
  private refresh: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  async setTokens(access: string, refresh: string): Promise<void> {
    this.access = access;
    this.refresh = refresh;
    await storageSet(ACCESS_KEY, access);
    await storageSet(REFRESH_KEY, refresh);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.refresh ?? storageGet(REFRESH_KEY);
  }

  async clearTokens(): Promise<void> {
    this.access = null;
    this.refresh = null;
    await storageDelete(ACCESS_KEY);
    await storageDelete(REFRESH_KEY);
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh = this.refresh ?? (await storageGet(REFRESH_KEY));
    if (!refresh) return false;
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      await this.clearTokens();
      return false;
    }
    const data = (await res.json()) as { access: string; refresh?: string };
    // Rotation: adopt the fresh refresh token when the server issues one.
    await this.setTokens(data.access, data.refresh ?? refresh);
    return true;
  }

  async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    const token = this.access ?? (await storageGet(ACCESS_KEY));
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && this.refreshing) {
      const ok = await this.refreshing;
      if (ok) return this.request(path, options);
      throw new ApiError(401, 'Unauthorized');
    }
    if (res.status === 401 && !url.includes('/api/v1/auth/refresh/')) {
      this.refreshing = this.tryRefresh();
      const ok = await this.refreshing;
      this.refreshing = null;
      if (ok) return this.request(path, options);
    }

    if (res.status === 204) return null;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON response */
    }
    if (!res.ok) {
      throw new ApiError(res.status, body);
    }
    return body;
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request(path) as Promise<T>;
  }

  /** GET a DRF list endpoint. Unwraps the paginated `{results: [...]}` envelope. */
  async getList<T>(path: string): Promise<T[]> {
    const data = await this.get<{ results?: T[] } | T[]>(path);
    if (Array.isArray(data)) return data;
    return data.results ?? [];
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }) as Promise<T>;
  }

  patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }) as Promise<T>;
  }
}

export const api = new Api();

/** Human-readable message from an API failure. DRF ships `detail` as a
 * string or a list of strings, sometimes nested one level deep. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const detail = err.detail as
      | { detail?: string | string[] }
      | string
      | string[]
      | null
      | undefined;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.join(', ');
    const inner = detail?.detail;
    if (typeof inner === 'string') return inner;
    if (Array.isArray(inner)) return inner.join(', ');
    if (detail && typeof detail === 'object') {
      const messages = Object.values(detail).flatMap((v) =>
        Array.isArray(v) ? v.filter((m): m is string => typeof m === 'string') : [],
      );
      if (messages.length > 0) return messages.join(' ');
    }
  }
  return fallback;
}
