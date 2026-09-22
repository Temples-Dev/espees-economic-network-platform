import { Building2, Minus, Plus, Search, Star, X } from "lucide-react";
import { useEffect, useState } from "react";

import { IconChip, ICON_CHIP_ROTATION } from "@/components/ui/icon-chip";

import { errorMessage } from "../lib/api";
import type { Business, Offering, Order } from "../lib/catalog";
import { createOrder, listBusinesses, listOfferings } from "../lib/catalog";
import type { Payment } from "../lib/money";
import { confirmPayment, createMerchantPayment, newIdempotencyKey } from "../lib/money";
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
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orderPayment, setOrderPayment] = useState<Payment | null>(null);
  const [paying, setPaying] = useState(false);
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
    setLastOrder(null);
    setOrderPayment(null);
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

  async function payForOrder() {
    if (!selected || !lastOrder) return;
    setOrderError(null);
    setPaying(true);
    try {
      const payment = await createMerchantPayment({
        narration: `Order at ${selected.name}`,
        amount_espees: lastOrder.total,
        idempotency_key: newIdempotencyKey(),
        user_data: { eenp_order_id: lastOrder.id },
      });
      setOrderPayment(payment);
    } catch (err) {
      setOrderError(errorMessage(err, "Payment creation failed."));
    } finally {
      setPaying(false);
    }
  }

  async function confirmOrderPayment() {
    if (!orderPayment) return;
    setOrderError(null);
    try {
      setOrderPayment(await confirmPayment(orderPayment.id));
    } catch (err) {
      setOrderError(errorMessage(err, "Confirmation failed."));
    }
  }

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
      setLastOrder(order);
      setOrderPayment(null);
      setNotice(`Order placed: ${order.total} ESP. Pay the business to complete it.`);
    } catch (err) {
      setOrderError(errorMessage(err, "Order placement failed."));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Discover</h2>
        <p className="mt-1 text-sm text-body">Find businesses, products and services on the network.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses…"
            className={`${inputClass} pl-10`}
          />
        </div>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {businesses.map((b, i) => (
            <button key={b.id} onClick={() => open(b)} className="block text-left">
              <Card className="flex h-full items-start gap-3">
                <IconChip icon={Building2} tone={ICON_CHIP_ROTATION[i % ICON_CHIP_ROTATION.length]} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{b.name}</p>
                    {b.verification_status === "verified" && <StatusPill value="verified" />}
                  </div>
                  <p className="text-sm text-body">
                    {[b.category, b.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {b.average_rating != null && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-body/80">
                      <Star className="h-3 w-3 fill-gold text-gold" />
                      {b.average_rating} ({b.review_count ?? 0} reviews)
                    </p>
                  )}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <IconChip icon={Building2} tone="royal" />
              <div>
                <h3 className="font-medium text-ink">{selected.name}</h3>
                <p className="text-sm text-body">{selected.description || "No description."}</p>
                {selected.location && <p className="text-xs text-body/80">{selected.location}</p>}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="rounded-lg p-1.5 text-body hover:bg-paper hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h4 className="mt-4 mb-2 text-sm font-medium text-ink/80">Products & services</h4>
          {offerings.length === 0 ? (
            <Muted>No offerings listed.</Muted>
          ) : (
            <div className="space-y-2">
              {offerings.map((o) => {
                const qty = basket[o.id] ?? 0;
                return (
                  <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-paper p-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{o.name}</p>
                      <p className="text-xs text-body/80">
                        {o.kind} · {o.price} ESP
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        aria-label={`Remove one ${o.name}`}
                        onClick={() => setQty(o.id, qty - 1)}
                        disabled={qty === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink/80 disabled:opacity-30"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span aria-label={`Quantity of ${o.name}`} className="w-5 text-center text-sm">
                        {qty}
                      </span>
                      <button
                        aria-label={`Add one ${o.name}`}
                        onClick={() => setQty(o.id, qty + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-ink/80 hover:border-royal/40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {basketCount > 0 && (
            <div className="mt-4 space-y-2 rounded-xl border border-royal/20 bg-surface-selected/50 p-3">
              <p className="text-sm text-ink/80">
                Basket: {basketCount} item{basketCount === 1 ? "" : "s"} · ≈ {basketEstimate()} ESP
                <span className="text-body/80"> (total confirmed on placement)</span>
              </p>
              <ErrorText message={orderError} />
              <PrimaryButton disabled={placing} onClick={() => void placeOrder()}>
                {placing ? "Placing…" : "Place order"}
              </PrimaryButton>
            </div>
          )}
          {basketCount === 0 && <NoticeText message={notice} />}
          {basketCount === 0 && justOrdered && lastOrder && !orderPayment && (
            <button
              onClick={() => void payForOrder()}
              disabled={paying}
              className="mt-3 w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {paying ? "Creating payment…" : `Pay ${lastOrder.total} ESP now`}
            </button>
          )}
          {orderPayment && (
            <div className="mt-3 rounded-xl bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {orderPayment.amount_espees} ESP payment
                </p>
                <StatusPill value={orderPayment.status} />
              </div>
              {orderPayment.payment_url && (
                <a
                  href={orderPayment.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-600"
                >
                  Continue in Espees portal
                </a>
              )}
              <button
                onClick={() => void confirmOrderPayment()}
                className="mt-2 w-full rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-royal/40"
              >
                Check confirmation status
              </button>
            </div>
          )}
          {basketCount === 0 && justOrdered && (
            <button
              onClick={() => onGo("orders")}
              className="mt-2 w-full text-sm text-royal hover:underline"
            >
              View your orders
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
