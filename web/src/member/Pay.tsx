import { useState } from "react";

import { errorMessage } from "../lib/api";
import type { Payment } from "../lib/money";
import { confirmPayment, createMerchantPayment, newIdempotencyKey } from "../lib/money";
import { Card, ErrorText, Field, Muted, NoticeText, PrimaryButton, StatusPill, inputClass } from "./ui";

export function Pay() {
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await createMerchantPayment({
        narration: narration.trim(),
        amount_espees: amount.trim(),
        idempotency_key: newIdempotencyKey(),
      });
      setPayment(created);
    } catch (err) {
      setError(errorMessage(err, "Payment creation failed."));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!payment) return;
    setError(null);
    setConfirming(true);
    try {
      setPayment(await confirmPayment(payment.id));
    } catch (err) {
      setError(errorMessage(err, "Confirmation failed."));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-medium">New merchant payment</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Creates a payment intent, then continue in the Espees portal. Only a server-side
          confirmation completes the payment.
        </p>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <Field label="What is this for?">
            <input
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Lunch at Ama's Kitchen"
              required
              maxLength={255}
              className={inputClass}
            />
          </Field>
          <Field label="Amount (ESP)">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25.00"
              required
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              className={inputClass}
            />
          </Field>
          <ErrorText message={error} />
          <PrimaryButton disabled={busy}>{busy ? "Creating…" : "Create payment"}</PrimaryButton>
        </form>
      </Card>

      {payment && (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">
              {payment.amount_espees} ESP · {payment.narration}
            </p>
            <StatusPill value={payment.status} />
          </div>
          <div className="mt-2 space-y-1 text-sm text-zinc-400">
            {payment.espees_payment_ref && (
              <p className="break-all font-mono text-xs">Ref: {payment.espees_payment_ref}</p>
            )}
            {payment.status_detail && <p className="text-xs">{payment.status_detail}</p>}
          </div>
          {payment.payment_url ? (
            <a
              href={payment.payment_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-600"
            >
              Continue in Espees portal
            </a>
          ) : (
            <Muted>Espees portal link pending — the intent is recorded.</Muted>
          )}
          <button
            onClick={() => void confirm()}
            disabled={confirming}
            className="mt-2 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-50"
          >
            {confirming ? "Confirming…" : "Check confirmation status"}
          </button>
          <NoticeText
            message={
              payment.status === "completed"
                ? `Confirmed${payment.customer_username ? ` as ${payment.customer_username}` : ""}.`
                : null
            }
          />
        </Card>
      )}
    </div>
  );
}
