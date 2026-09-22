import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { IconChip } from "@/components/ui/icon-chip";

import { errorMessage } from "../lib/api";
import type { Order } from "../lib/catalog";
import { listOrders } from "../lib/catalog";
import { Card, ErrorText, Muted, StatusPill } from "./ui";

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load orders.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Orders</h2>
        <p className="mt-1 text-sm text-body">Everything you've bought through the network.</p>
      </div>

      <ErrorText message={error} />

      {loading ? (
        <Muted>Loading…</Muted>
      ) : orders.length === 0 ? (
        <Card>
          <Muted>No orders yet. When you buy from a business, the order appears here.</Muted>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Card key={o.id} className="flex items-start gap-3">
              <IconChip icon={ShoppingBag} tone="royal" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {o.total} ESP · {o.business_name ?? "Business"}
                  </p>
                  <StatusPill value={o.status} />
                </div>
                {o.items && o.items.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-body">
                    {o.items.map((item, i) => (
                      <li key={i}>
                        {item.offering_name ?? "Item"} × {item.quantity} — {item.line_total} ESP
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-body/80">
                  {new Date(o.created_at).toLocaleString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
