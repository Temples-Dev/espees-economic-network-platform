import { useEffect, useState } from "react";

import { errorMessage } from "../lib/api";
import type { Business, Offering } from "../lib/catalog";
import { createOrder, listBusinesses, listOfferings } from "../lib/catalog";
import type { MemberTab } from "./MemberApp";
import { Card, ErrorText, Muted, NoticeText, PrimaryButton, StatusPill, inputClass } from "./ui";

export function Discover({ onGo }: { onGo: (tab: MemberTab) => void }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [justOrdered, setJustOrdered] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listBusinesses(submitted)
      .then(setBusinesses)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load businesses.")))
      .finally(() => setLoading(false));
  }, [submitted]);

  function open(b: Business) {
    setSelected(b);
    setOfferings([]);
    setBasket({});
    setJustOrdered(false);
    setNotice(null);
    setError(null);
    setOrderError(null);
    listOfferings(b.id)
      .then(setOfferings)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load offerings.")));
  }

  function setQty(id: string, qty: number) {
    setJustOrdered(false);
    setBasket((prev) => {
      if (qty <= 0) {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: qty };
    });
  }

  function basketEstimate(): string {
    let total = 0;
    for (const o of offerings) {
      const qty = basket[o.id] ?? 0;
      if (qty > 0) total += parseFloat(o.price) * qty;
    }
    return total.toFixed(2);
  }

  const basketCount = Object.values(basket).reduce((n, q) => n + q, 0);

  async function placeOrder() {
    if (!selected || basketCount === 0) return;
    setOrderError(null);
    setNotice(null);
    setPlacing(true);
    try {
      const order = await createOrder(
        selected.id,
        Object.entries(basket).map(([offering, quantity]) => ({ offering, quantity })),
      );
      setBasket({});
      setJustOrdered(true);
      setNotice(`Order placed: ${order.total} ESP. Pay the business to complete it.`);
    } catch (err) {
      setOrderError(errorMessage(err, "Order placement failed."));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses…"
          className={`flex-1 ${inputClass}`}
        />
        <button
          type="submit"
          className="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep"
        >
          Search
        </button>
      </form>
      <ErrorText message={error} />
      {loading ? (
        <Muted>Loading…</Muted>
      ) : businesses.length === 0 ? (
        <Muted>No businesses found.</Muted>
      ) : (
        <div className="space-y-2">
          {businesses.map((b) => (
            <button key={b.id} onClick={() => open(b)} className="block w-full text-left">
              <Card>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{b.name}</p>
                  {b.verification_status === "verified" && <StatusPill value="verified" />}
                </div>
                <p className="text-sm text-zinc-400">
                  {[b.category, b.location].filter(Boolean).join(" · ") || "—"}
                </p>
                {b.average_rating != null && (
                  <p className="text-xs text-zinc-500">
                    ★ {b.average_rating} ({b.review_count ?? 0} reviews)
                  </p>
                )}
              </Card>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{selected.name}</h3>
              <p className="text-sm text-zinc-400">{selected.description || "No description."}</p>
              {selected.location && <p className="text-xs text-zinc-500">{selected.location}</p>}
            </div>
            <button onClick={() => setSelected(null)} className="text-sm text-zinc-400 hover:text-zinc-200">
              Close
            </button>
          </div>
          <h4 className="mt-3 mb-2 text-sm font-medium text-zinc-300">Products & services</h4>
          {offerings.length === 0 ? (
            <Muted>No offerings listed.</Muted>
          ) : (
            <div className="space-y-2">
              {offerings.map((o) => {
                const qty = basket[o.id] ?? 0;
                return (
                  <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950 p-3">
                    <div>
                      <p className="text-sm font-medium">{o.name}</p>
                      <p className="text-xs text-zinc-500">
                        {o.kind} · {o.price} ESP
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label={`Remove one ${o.name}`}
                        onClick={() => setQty(o.id, qty - 1)}
                        disabled={qty === 0}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-sm text-zinc-300 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span aria-label={`Quantity of ${o.name}`} className="w-5 text-center text-sm">
                        {qty}
                      </span>
                      <button
                        aria-label={`Add one ${o.name}`}
                        onClick={() => setQty(o.id, qty + 1)}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-sm text-zinc-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {basketCount > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-zinc-300">
                Basket: {basketCount} item{basketCount === 1 ? "" : "s"} · ≈ {basketEstimate()} ESP
                <span className="text-zinc-500"> (total confirmed on placement)</span>
              </p>
              <ErrorText message={orderError} />
              <PrimaryButton disabled={placing} onClick={() => void placeOrder()}>
                {placing ? "Placing…" : "Place order"}
              </PrimaryButton>
            </div>
          )}
          {basketCount === 0 && <NoticeText message={notice} />}
          {basketCount === 0 && justOrdered && (
            <button
              onClick={() => onGo("orders")}
              className="w-full text-sm text-gold hover:underline"
            >
              View your orders
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
