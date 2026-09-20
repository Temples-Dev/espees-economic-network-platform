import { useEffect, useState } from "react";

import { ApiError, api } from "./lib/api";
import type { User } from "./lib/auth";

export function App() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<User>("/api/v1/me/").then(setUser).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { access, refresh } = await api.post<{ access: string; refresh: string }>(
        "/api/v1/auth/login/",
        { email, password },
      );
      api.setTokens(access, refresh);
      const me = await api.get<User>("/api/v1/me/");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail as { detail?: string } | string[] | null;
        setError(
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.join(", ")
              : detail?.detail ?? "Login failed.",
        );
      } else {
        setError("Login failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <main className="mx-auto mt-16 max-w-md px-6">
        <h1 className="text-2xl font-semibold">Espees Economic Network</h1>
        <p className="mt-2 text-zinc-400">Signed in as {user.email}</p>
        <p className="text-sm text-zinc-500">
          Wallet: {user.wallet?.espees_wallet_id ?? "pending"}
        </p>
        <button
          onClick={async () => {
            try {
              await api.post("/api/v1/auth/logout/", {});
            } finally {
              api.clearTokens();
              setUser(null);
            }
          }}
          className="mt-8 w-full rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
        >
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="text-2xl font-semibold">Espees Economic Network</h1>
      <p className="mt-1 text-sm text-zinc-500">eenp web frontend</p>
      <div className="mt-6 flex gap-4 text-sm">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={m === mode ? "font-medium text-gold" : "text-zinc-400"}
          >
            {m === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="text-zinc-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">
            {mode === "login" ? "Password" : "Choose a password"}
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-royal px-4 py-2 font-medium text-white hover:bg-deep disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </main>
  );
}
