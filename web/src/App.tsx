import { useEffect, useState } from "react";

import { api, errorMessage } from "./lib/api";
import type { User } from "./lib/auth";
import { MemberApp } from "./member/MemberApp";

type Category = { id: string; name: string; slug: string };
type Order = {
  id: string;
  customer_email: string;
  business_name: string;
  status: string;
  total: string;
  created_at: string;
};
type SessionRow = {
  device_key: string | null;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
};
type Notice = { id: string; title: string; message: string; is_read: boolean };
type WalletRow = {
  id: string;
  user_id: string;
  user_email: string;
  espees_wallet_address: string;
  external_account_reference: string;
  status: string;
  status_detail: string;
  provisioned_at: string | null;
  updated_at: string;
};

type Section = "overview" | "orders" | "categories" | "sessions" | "account" | "member" | "wallets";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function signOut(): Promise<void> {
  try {
    await api.post("/api/v1/auth/logout/", { refresh: api.getRefreshToken() });
  } catch {
    /* fall through to local cleanup */
  } finally {
    api.clearTokens();
  }
}

function LoginForm({ onDone }: { onDone: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishWithTokens(pair: { access: string; refresh: string }) {
    api.setTokens(pair.access, pair.refresh);
    onDone(await api.get<User>("/api/v1/me/"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.post("/api/v1/auth/register/", { email, password });
      }
      const body = await api.post<{
        access?: string;
        refresh?: string;
        two_factor_required?: boolean;
      }>("/api/v1/auth/login/", { email, password });
      if (body.two_factor_required) {
        setNeedsCode(true);
        return;
      }
      await finishWithTokens(body as { access: string; refresh: string });
    } catch (err) {
      setError(errorMessage(err, mode === "login" ? "Sign-in failed." : "Sign-up failed."));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const pair = await api.post<{ access: string; refresh: string }>(
        "/api/v1/auth/login/2fa/",
        { email, code },
      );
      setNeedsCode(false);
      setCode("");
      await finishWithTokens(pair);
    } catch (err) {
      setError(errorMessage(err, "Invalid code."));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/v1/auth/password-reset/", { email });
      setResetSent(true);
    } catch {
      setError("Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (showReset) {
    return (
      <main className="mx-auto mt-16 max-w-sm px-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter your account email and we will send a reset link.
        </p>
        {resetSent ? (
          <p className="mt-4 text-sm text-emerald-400">
            If the account exists, a reset email has been sent.
          </p>
        ) : (
          <form onSubmit={submitReset} className="mt-4 space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              autoComplete="email"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-royal px-4 py-2 font-medium text-white hover:bg-deep disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <button
          onClick={() => {
            setShowReset(false);
            setResetSent(false);
            setError(null);
          }}
          className="mt-4 w-full text-sm text-zinc-400 hover:text-zinc-200"
        >
          Back to sign-in
        </button>
      </main>
    );
  }

  if (needsCode) {
    return (
      <main className="mx-auto mt-16 max-w-sm px-6">
        <h1 className="text-2xl font-semibold">Two-factor code</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enter the 6-digit code from your authenticator app.
        </p>
        <form onSubmit={submitCode} className="mt-4 space-y-4">
          <input
            required
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-xl tracking-widest"
            autoComplete="one-time-code"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-royal px-4 py-2 font-medium text-white hover:bg-deep disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => {
              setNeedsCode(false);
              setCode("");
              setError(null);
            }}
            className="w-full text-sm text-zinc-400 hover:text-zinc-200"
          >
            Back to sign-in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="text-2xl font-semibold">EENP Admin</h1>
      <p className="mt-1 text-sm text-zinc-500">Espees Economic Network · staff console</p>
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
        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setShowReset(true);
              setError(null);
            }}
            className="w-full text-sm text-zinc-400 hover:text-zinc-200"
          >
            Forgot password?
          </button>
        )}
      </form>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}

function Overview() {
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [biz, orders, camps, convos, notes, sess, walletQueue] = await Promise.all([
          api.getList("/api/v1/businesses/"),
          api.getList("/api/v1/orders/"),
          api.getList("/api/v1/campaigns/"),
          api.getList("/api/v1/conversations/"),
          api.getList<Notice>("/api/v1/notifications/"),
          api.get<{ sessions: SessionRow[] }>("/api/v1/auth/sessions/"),
          api.getList<WalletRow>("/api/v1/wallets/").catch(() => [] as WalletRow[]),
        ]);
        setCounts({
          Businesses: biz.length,
          Orders: orders.length,
          Campaigns: camps.length,
          Conversations: convos.length,
          "Unread notifications": notes.filter((n) => !n.is_read).length,
          "Recent sessions": sess.sessions.length,
          "Wallets awaiting verification": walletQueue.length,
        });
      } catch (err) {
        setError(errorMessage(err, "Could not load overview."));
      }
    })();
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {Object.entries(counts).map(([label, value]) => (
        <Stat key={label} label={label} value={value} />
      ))}
      {Object.keys(counts).length === 0 && <p className="text-sm text-zinc-500">Loading…</p>}
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    return api
      .getList<Order>("/api/v1/orders/")
      .then(setOrders)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load orders.")));
  }

  useEffect(() => {
    void refresh();
  }, []);

  const NEXT: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["fulfilled", "cancelled"],
  };

  async function transition(id: string, next: string) {
    setError(null);
    setBusy(id + next);
    try {
      await api.patch(`/api/v1/orders/${id}/status/`, { status: next });
      await refresh();
    } catch (err) {
      setError(errorMessage(err, `Could not move order to ${next}.`));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (orders.length === 0) return <p className="text-sm text-zinc-500">No orders yet.</p>;
  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="font-medium">
            {o.total} Espees · {o.status}
          </p>
          <p className="text-sm text-zinc-400">
            {o.business_name} · {o.customer_email} · {new Date(o.created_at).toLocaleString()}
          </p>
          {(NEXT[o.status] ?? []).length > 0 && (
            <div className="mt-2 flex gap-2">
              {NEXT[o.status].map((next) => (
                <button
                  key={next}
                  disabled={busy !== null}
                  onClick={() => void transition(o.id, next)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
                >
                  {busy === o.id + next ? "Working…" : `Mark ${next}`}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Wallets() {
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [filter, setFilter] = useState("requires_action");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh(nextFilter: string) {
    return api
      .getList<WalletRow>(`/api/v1/wallets/?status=${nextFilter}`)
      .then(setRows)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load wallet queue.")));
  }

  useEffect(() => {
    void refresh(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function verify(row: WalletRow) {
    setError(null);
    setNotice(null);
    setBusy(row.user_id);
    try {
      await api.post("/api/v1/wallet/verify/", { user_id: row.user_id });
      setNotice(`Verified wallet for ${row.user_email}.`);
      await refresh(filter);
    } catch (err) {
      setError(errorMessage(err, "Verification failed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400">Show:</span>
        {(["requires_action", "attention", "associated", "pending_external"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              filter === s
                ? "rounded-lg bg-royal px-3 py-1.5 text-white"
                : "rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:border-zinc-500"
            }
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-emerald-400">{notice}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Queue empty.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="font-medium">{r.user_email}</p>
              <p className="break-all font-mono text-xs text-zinc-400">{r.espees_wallet_address}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {r.status.replace(/_/g, " ")} · claimed {new Date(r.updated_at).toLocaleString()}
              </p>
              {r.status !== "associated" && (
                <button
                  disabled={busy !== null}
                  onClick={() => void verify(r)}
                  className="mt-2 rounded-lg bg-royal px-3 py-1.5 text-xs font-medium text-white hover:bg-deep disabled:opacity-50"
                >
                  {busy === r.user_id ? "Verifying…" : "Verify address"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Categories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    setCats(await api.getList<Category>("/api/v1/categories/"));
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(errorMessage(err, "Could not load categories.")));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api.post("/api/v1/categories/", { name: name.trim(), slug: slugify(name) });
      setName("");
      setNotice("Category created.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Category creation failed."));
    } finally {
      setBusy(false);
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    setBusy(true);
    try {
      await api.patch(`/api/v1/categories/${editing.id}/`, { name: editing.name });
      setEditing(null);
      setNotice("Category renamed.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Rename failed."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category?")) return;
    setError(null);
    try {
      await api.del(`/api/v1/categories/${id}/`);
      setNotice("Category deleted.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "Delete failed."));
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-emerald-400">{notice}</p>}
      {editing && (
        <form
          onSubmit={rename}
          className="flex gap-2 rounded-xl border border-gold/40 bg-zinc-900 p-3"
        >
          <input
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
          >
            Cancel
          </button>
        </form>
      )}
      {cats.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3"
        >
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-zinc-500">{c.slug}</p>
          </div>
          <div className="flex gap-2 text-sm">
            <button onClick={() => setEditing(c)} className="text-gold hover:underline">
              Rename
            </button>
            <button onClick={() => void remove(c.id)} className="text-red-400 hover:underline">
              Delete
            </button>
          </div>
        </div>
      ))}
      {cats.length === 0 && <p className="text-sm text-zinc-500">No categories yet.</p>}
    </div>
  );
}

function Sessions() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ sessions: SessionRow[] }>("/api/v1/auth/sessions/")
      .then((d) => setRows(d.sessions))
      .catch((err: unknown) => setError(errorMessage(err, "Could not load sessions.")));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No sign-in activity.</p>;
  return (
    <div className="space-y-2">
      {rows.map((s, i) => (
        <div key={`${s.device_key}-${s.created_at}-${i}`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="font-medium">
            Device {s.device_key ? s.device_key.slice(0, 12) : "unknown"}
          </p>
          <p className="text-sm text-zinc-400">
            {s.ip_address ?? "unknown IP"} · {new Date(s.created_at).toLocaleString()}
          </p>
          <p className="truncate text-xs text-zinc-500">{s.user_agent || "unknown browser"}</p>
        </div>
      ))}
    </div>
  );
}

function Account({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ detail: string }>("/api/v1/auth/change-password/", {
        old_password: current,
        new_password: next,
      });
      await signOut();
      setNotice(`${res.detail} Please sign in again.`);
      onSignedOut();
    } catch (err) {
      setError(errorMessage(err, "Password change failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="font-medium">{user.full_name || user.email}</p>
        <p className="text-sm text-zinc-400">
          {user.email} · staff · {user.is_verified ? "verified" : "unverified"}
        </p>
      </div>
      <form onSubmit={changePassword} className="space-y-3">
        <h3 className="font-medium">Change password</h3>
        <p className="text-xs text-zinc-500">This signs out all other sessions immediately.</p>
        <input
          type="password"
          required
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          autoComplete="current-password"
        />
        <input
          type="password"
          required
          placeholder="New password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          autoComplete="new-password"
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {notice && <p className="text-sm text-emerald-400">{notice}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep disabled:opacity-50"
        >
          {busy ? "Working…" : "Change password"}
        </button>
      </form>
      <button
        onClick={() => void signOut().then(onSignedOut)}
        className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
      >
        Sign out
      </button>
    </div>
  );
}

function Dashboard({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [section, setSection] = useState<Section>("overview");
  const tabs: Array<{ id: Section; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders" },
    { id: "wallets", label: "Wallets" },
    { id: "categories", label: "Categories" },
    { id: "sessions", label: "Sessions" },
    { id: "account", label: "Account" },
    { id: "member", label: "Member view" },
  ];

  return (
    <main className="mx-auto mt-8 max-w-2xl px-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">EENP Admin</h1>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <button
          onClick={() => void signOut().then(onSignedOut)}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
        >
          Sign out
        </button>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={
              section === t.id
                ? "rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="mt-6">
        {section === "overview" && <Overview />}
        {section === "orders" && <Orders />}
        {section === "wallets" && <Wallets />}
        {section === "categories" && <Categories />}
        {section === "sessions" && <Sessions />}
        {section === "account" && <Account user={user} onSignedOut={onSignedOut} />}
        {section === "member" && <MemberApp user={user} onSignOut={() => void signOut().then(onSignedOut)} />}
      </div>
    </main>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<User>("/api/v1/me/")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8 text-zinc-400">Loading…</p>;
  if (!user) return <LoginForm onDone={setUser} />;
  if (!user.is_staff) {
    return (
      <main>
        <MemberApp user={user} onSignOut={() => void signOut().then(() => setUser(null))} />
      </main>
    );
  }
  return <Dashboard user={user} onSignedOut={() => setUser(null)} />;
}
