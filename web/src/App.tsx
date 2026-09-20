import { useEffect, useState } from "react";

import { api, errorMessage } from "./lib/api";
import type { User } from "./lib/auth";

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

type Section = "overview" | "orders" | "categories" | "sessions" | "account";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.post("/api/v1/auth/register/", { email, password });
      }
      const pair = await api.post<{ access: string; refresh: string }>(
        "/api/v1/auth/login/",
        { email, password },
      );
      api.setTokens(pair.access, pair.refresh);
      onDone(await api.get<User>("/api/v1/me/"));
    } catch (err) {
      setError(errorMessage(err, mode === "login" ? "Sign-in failed." : "Sign-up failed."));
    } finally {
      setBusy(false);
    }
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
        const [biz, orders, camps, convos, notes, sess] = await Promise.all([
          api.getList("/api/v1/businesses/"),
          api.getList("/api/v1/orders/"),
          api.getList("/api/v1/campaigns/"),
          api.getList("/api/v1/conversations/"),
          api.getList<Notice>("/api/v1/notifications/"),
          api.get<{ sessions: SessionRow[] }>("/api/v1/auth/sessions/"),
        ]);
        setCounts({
          Businesses: biz.length,
          Orders: orders.length,
          Campaigns: camps.length,
          Conversations: convos.length,
          "Unread notifications": notes.filter((n) => !n.is_read).length,
          "Recent sessions": sess.sessions.length,
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

function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getList<Order>("/api/v1/orders/")
      .then(setOrders)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load orders.")));
  }, []);

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
        </div>
      ))}
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
    { id: "categories", label: "Categories" },
    { id: "sessions", label: "Sessions" },
    { id: "account", label: "Account" },
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
        {section === "categories" && <Categories />}
        {section === "sessions" && <Sessions />}
        {section === "account" && <Account user={user} onSignedOut={onSignedOut} />}
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
      <main className="mx-auto mt-16 max-w-sm px-6 text-center">
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {user.email} is signed in but is not staff.
        </p>
        <button
          onClick={() => void signOut().then(() => setUser(null))}
          className="mt-6 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          Sign out
        </button>
      </main>
    );
  }
  return <Dashboard user={user} onSignedOut={() => setUser(null)} />;
}
