import { useState } from "react";

import type { User } from "../lib/auth";
import { Campaigns } from "./Campaigns";
import { Discover } from "./Discover";
import { Home } from "./Home";
import { Orders } from "./Orders";
import { Pay } from "./Pay";
import { Wallet } from "./Wallet";

type Tab = "home" | "wallet" | "pay" | "discover" | "orders" | "campaigns";

export type MemberTab = Tab;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "wallet", label: "Wallet" },
  { id: "pay", label: "Pay" },
  { id: "discover", label: "Discover" },
  { id: "orders", label: "Orders" },
  { id: "campaigns", label: "Campaigns" },
];

export function MemberApp({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="mx-auto mt-8 max-w-2xl px-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Espees</h1>
          <p className="text-sm text-zinc-500">{user.full_name || user.email}</p>
        </div>
        <button
          onClick={onSignOut}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
        >
          Sign out
        </button>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="mt-6">
        {tab === "home" && <Home onGo={setTab} />}
        {tab === "wallet" && <Wallet />}
        {tab === "pay" && <Pay />}
        {tab === "discover" && <Discover />}
        {tab === "orders" && <Orders />}
        {tab === "campaigns" && <Campaigns />}
      </div>
    </div>
  );
}
