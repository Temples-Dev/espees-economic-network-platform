import { Building2, CreditCard, Radio } from "lucide-react";
import { useEffect, useState } from "react";

import { IconChip } from "@/components/ui/icon-chip";

import { errorMessage } from "../lib/api";
import type { User } from "../lib/auth";
import { listBusinesses, listCampaigns } from "../lib/catalog";
import type { Capabilities, Payment } from "../lib/money";
import { getCapabilities, listPayments } from "../lib/money";
import { Card, Muted, StatusPill } from "./ui";

import type { MemberTab } from "./MemberApp";

function firstName(user: User): string {
  if (user.full_name) return user.full_name.split(/\s+/)[0]!;
  const local = user.email.split("@")[0]!;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function Home({ user, onGo }: { user: User; onGo: (tab: MemberTab) => void }) {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [counts, setCounts] = useState<{ businesses: number; campaigns: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, b, camps] = await Promise.all([
          getCapabilities(),
          listPayments(),
          listBusinesses(),
          listCampaigns(),
        ]);
        setCaps(c);
        setPayments(p.slice(0, 5));
        setCounts({ businesses: b.length, campaigns: camps.length });
      } catch (err) {
        setError(errorMessage(err, "Could not load your dashboard."));
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Welcome back, {firstName(user)}</h2>
        <p className="mt-1 text-sm text-body">Here's what's happening across your account today.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-deep via-royal to-[#0e2c8f] p-6 text-white shadow-[var(--shadow-panel)] lg:col-span-2">
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl"
            aria-hidden
          />
          <p className="relative text-sm text-white/70">Your wallet</p>
          {caps ? (
            <div className="relative mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize text-white">
                {(caps.wallet_status ?? "unknown").replace(/_/g, " ")}
              </span>
              {!caps.wallet_ready && (
                <span className="text-xs text-white/60">
                  Setup pending — link your Espees wallet to enable payments.
                </span>
              )}
            </div>
          ) : (
            <p className="relative mt-2 text-sm text-white/60">Loading…</p>
          )}
          <div className="relative mt-6 flex gap-2">
            <button
              onClick={() => onGo("wallet")}
              className="rounded-lg border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Open wallet
            </button>
            <button
              onClick={() => onGo("pay")}
              disabled={caps !== null && !caps.PAYMENT_AVAILABLE}
              className="rounded-lg bg-gold px-3.5 py-2 text-sm font-semibold text-deep hover:bg-gold/90 disabled:opacity-50"
            >
              Pay
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card className="flex items-center gap-3">
            <IconChip icon={Building2} tone="gold" size={40} />
            <div>
              <p className="text-xl font-semibold text-ink">{counts?.businesses ?? "…"}</p>
              <p className="text-xs text-body">Businesses</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <IconChip icon={Radio} tone="bronze" size={40} />
            <div>
              <p className="text-xl font-semibold text-ink">{counts?.campaigns ?? "…"}</p>
              <p className="text-xs text-body">Campaigns</p>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-ink">Recent activity</h3>
        {payments.length === 0 ? (
          <Card>
            <Muted>No payments yet. Your platform payment activity will appear here.</Muted>
          </Card>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="flex items-center gap-3">
                <IconChip icon={CreditCard} tone="royal" size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-ink">
                      {p.amount_espees} ESP · {p.narration}
                    </p>
                    <StatusPill value={p.status} />
                  </div>
                  <p className="text-xs text-body/80">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
