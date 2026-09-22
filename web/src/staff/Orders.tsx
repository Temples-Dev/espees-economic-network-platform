import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

import { api, errorMessage } from "../lib/api";
import type { Order } from "./types";

const NEXT: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled"],
};

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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (orders.length === 0) return <p className="text-sm text-body">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Card key={o.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">
              {o.total} Espees · <StatusBadge value={o.status} />
            </p>
            <p className="mt-1 text-sm text-body">
              {o.business_name} · {o.customer_email} · {new Date(o.created_at).toLocaleString()}
            </p>
          </div>
          {(NEXT[o.status] ?? []).length > 0 && (
            <div className="flex gap-2">
              {NEXT[o.status].map((next) => (
                <Button
                  key={next}
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void transition(o.id, next)}
                >
                  {busy === o.id + next ? "Working…" : `Mark ${next}`}
                </Button>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
