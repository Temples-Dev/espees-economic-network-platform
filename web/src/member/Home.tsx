import { useEffect, useState } from "react";

import { errorMessage } from "../lib/api";
import type { User } from "../lib/auth";
import { listBusinesses, listCampaigns } from "../lib/catalog";
import type { Capabilities, Payment } from "../lib/money";
import { getCapabilities, listPayments } from "../lib/money";
import { Card, Muted, StatusPill } from "./ui";

import type { MemberTab } from "./MemberApp";

function firstName(user: User): string {
  return (user.full_name || user.email).split(/\s+/)[0]!;
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
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Welcome back, {firstName(user)}</h2>
        <p className="mt-1 text-sm text-body">Here's what's happening across your account today.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <p className="text-sm text-body">Wallet</p>
        {caps ? (
          <div className="mt-1 flex items-center gap-2">
            <StatusPill value={caps.wallet_status ?? "unknown"} />
            {!caps.wallet_ready && (
              <span className="text-xs text-body/80">
                Setup pending — link your Espees wallet to enable payments.
              </span>
            )}
          </div>
        ) : (
          <Muted>Loading…</Muted>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onGo("wallet")}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink hover:border-royal/40"
          >
            Open wallet
          </button>
          <button
            onClick={() => onGo("pay")}
            disabled={caps !== null && !caps.PAYMENT_AVAILABLE}
            className="rounded-lg bg-royal px-3 py-1.5 text-sm font-medium text-white hover:bg-deep disabled:opacity-50"
          >
            Pay
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-2xl font-semibold">{counts?.businesses ?? "…"}</p>
          <p className="text-sm text-body">Businesses</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold">{counts?.campaigns ?? "…"}</p>
          <p className="text-sm text-body">Campaigns</p>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 font-medium">Recent activity</h3>
        {payments.length === 0 ? (
          <Muted>No payments yet. Your platform payment activity will appear here.</Muted>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {p.amount_espees} ESP · {p.narration}
                  </p>
                  <StatusPill value={p.status} />
                </div>
                <p className="text-xs text-body/80">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
