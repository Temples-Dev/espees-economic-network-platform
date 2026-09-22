import { useEffect, useState } from "react";

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

  if (loading) return <Muted>Loading…</Muted>;

  return (
    <div className="space-y-2">
      <ErrorText message={error} />
      {orders.length === 0 ? (
        <Muted>No orders yet. When you buy from a business, the order appears here.</Muted>
      ) : (
        orders.map((o) => (
          <Card key={o.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {o.total} ESP · {o.business_name ?? "Business"}
              </p>
              <StatusPill value={o.status} />
            </div>
            {o.items && o.items.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                {o.items.map((item, i) => (
                  <li key={i}>
                    {item.offering_name ?? "Item"} × {item.quantity} — {item.line_total} ESP
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              {new Date(o.created_at).toLocaleString()}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
