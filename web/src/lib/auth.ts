import { api, ApiError } from "./api";

export type User = {
  id: string;
  email: string;
  full_name: string;
  is_verified: boolean;
  is_staff: boolean;
  wallet: { espees_wallet_id: string; status: string } | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
};

export class Auth {
  private user: User | null = null
  private access: string | null = null
  private refresh: string | null = null
  private listeners = new Set<() => void>()

  get isAuthenticated() { return this.access !== null }
  getUser() { return this.user }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private emit() {
    for (const fn of this.listeners) fn()
  }

  async init() {
    // A previously-stored access token lets us restore the session without a
    // fresh round-trip; a network failure simply falls back to logged-out.
    const stored = localStorage.getItem("espees.access")
    if (stored) {
      this.access = stored
      try {
        await this.refreshMe()
      } catch {
        this.access = null
        this.user = null
        this.emit()
      }
    }
  }

  async refreshMe() {
    if (!this.access) throw new ApiError(401, "Not authenticated")
    const me = await api.get("/api/v1/me/") as User
    this.user = me
    this.emit()
  }

  async login(email: string, password: string) {
    const pair = await api.post("/api/v1/auth/login/", { email, password }) as { access: string; refresh: string }
    this.access = pair.access
    this.refresh = pair.refresh
    localStorage.setItem("espees.access", pair.access)
    await this.refreshMe()
    this.emit()
  }

  async register(payload: RegisterPayload) {
    await api.post("/api/v1/auth/register/", payload)
  }

  async logout() {
    try {
      if (this.refresh) await api.post("/api/v1/auth/logout/", { refresh: this.refresh })
    } finally {
      this.access = null
      this.refresh = null
      this.user = null
      localStorage.removeItem("espees.access")
      this.emit()
    }
  }
}

// Singleton shared across the app; the AuthProvider snapshot reads it.
export const auth = new Auth()
