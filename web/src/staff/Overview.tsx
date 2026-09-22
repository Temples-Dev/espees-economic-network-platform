import { Building2, MessageSquare, PackageCheck, Radio, ShieldAlert, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";

import { api, errorMessage } from "../lib/api";
import type { User } from "../lib/auth";
import type { Notice, SessionRow, WalletRow } from "./types";

function firstName(user: User): string {
  return (user.full_name || user.email).split(/\s+/)[0]!;
}

type Stat = { label: string; value: number | string; icon: typeof Building2 };

function StatCard({ label, value, icon: Icon }: Stat) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-selected text-royal">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <p className="text-sm text-body">{label}</p>
      </div>
    </Card>
  );
}

export function Overview({ user }: { user: User }) {
  const [stats, setStats] = useState<Stat[] | null>(null);
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
        setStats([
          { label: "Businesses", value: biz.length, icon: Building2 },
          { label: "Orders", value: orders.length, icon: PackageCheck },
          { label: "Campaigns", value: camps.length, icon: Radio },
          { label: "Conversations", value: convos.length, icon: MessageSquare },
          { label: "Unread notifications", value: notes.filter((n) => !n.is_read).length, icon: ShieldAlert },
          { label: "Recent sessions", value: sess.sessions.length, icon: Users },
          { label: "Wallets awaiting verification", value: walletQueue.length, icon: Wallet },
        ]);
      } catch (err) {
        setError(errorMessage(err, "Could not load overview."));
      }
    })();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Welcome back, {firstName(user)}</h2>
        <p className="mt-1 text-sm text-body">Here's what's moving across the network today.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats
          ? stats.map((s) => <StatCard key={s.label} {...s} />)
          : Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-[76px] animate-pulse bg-paper" />
            ))}
      </div>
    </div>
  );
}
