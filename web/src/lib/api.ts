
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? (typeof detail === "string" ? detail : `Request failed (${status})`));
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

const ACCESS_KEY = "eenp.access";
const REFRESH_KEY = "eenp.refresh";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

class Api {
  private access: string | null = null;
  private refresh: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  setTokens(access: string, refresh: string) {
    this.access = access;
    this.refresh = refresh;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  clearTokens() {
    this.access = null;
    this.refresh = null;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  getRefreshToken(): string | null {
    return this.refresh ?? localStorage.getItem(REFRESH_KEY);
  }

  private async tryRefresh(): Promise<boolean> {
    const refresh = this.refresh ?? localStorage.getItem(REFRESH_KEY);
    if (!refresh) return false;
    const res = await fetch("/api/v1/auth/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      this.clearTokens();
      return false;
    }
    const data = (await res.json()) as { access: string; refresh?: string };
    // Rotation: adopt the fresh refresh token when the server issues one.
    this.setTokens(data.access, data.refresh ?? refresh);
    return true;
  }

  async request(path: string, options: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    const token = this.access ?? getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    let res = await fetch(path, { ...options, headers });

    if (res.status === 401 && this.refreshing) {
      const ok = await this.refreshing;
      if (ok) return this.request(path, options);
      throw new ApiError(401, "Unauthorized");
    }
    if (res.status === 401 && !path.startsWith("/api/v1/auth/refresh/")) {
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

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
    }) as Promise<T>;
  }

  patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }) as Promise<T>;
  }

  del<T = unknown>(path: string): Promise<T> {
    return this.request(path, { method: "DELETE" }) as Promise<T>;
  }

  /** GET a DRF list endpoint. Unwraps the paginated `{results: [...]}` envelope. */
  async getList<T>(path: string): Promise<T[]> {
    const data = await this.get<{ results?: T[] } | T[]>(path);
    if (Array.isArray(data)) return data;
    return data.results ?? [];
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
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.join(", ");
    const inner = detail?.detail;
    if (typeof inner === "string") return inner;
    if (Array.isArray(inner)) return inner.join(", ");
  }
  return fallback;
}
