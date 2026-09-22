import { useEffect, useState } from "react";

import { errorMessage } from "../lib/api";
import type { Payment } from "../lib/money";
import { confirmPayment, getPayment } from "../lib/money";
import { Card, ErrorText, Muted, NoticeText, StatusPill } from "./ui";

function readParams(): { id: string; result: string } {
  const params = new URLSearchParams(window.location.search);
  return { id: params.get("payment") ?? "", result: params.get("result") ?? "" };
}

/** Landing page for the hosted-flow return leg. The redirect proves
 *  nothing — this page shows the server-side verified status and offers
 *  an explicit confirmation check. */
export function PayReturn() {
  const [{ id, result }] = useState(readParams);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPayment(id)
      .then(setPayment)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load payment.")));
  }, [id]);

  async function check() {
    if (!id) return;
    setError(null);
    setChecking(true);
    try {
      setPayment(await confirmPayment(id));
    } catch (err) {
      setError(errorMessage(err, "Confirmation failed."));
    } finally {
      setChecking(false);
    }
  }

  function backToApp() {
    window.location.href = "/";
  }

  if (!id) {
    return (
      <main className="mx-auto mt-16 max-w-sm px-6">
        <h1 className="text-xl font-semibold">Payment return</h1>
        <p className="mt-2 text-sm text-body">No payment reference in this link.</p>
        <button
          onClick={backToApp}
          className="mt-6 w-full rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep"
        >
          Back to app
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-16 max-w-sm px-6">
      <h1 className="text-xl font-semibold">Payment return</h1>
      {result && (
        <p className="mt-1 text-sm text-body/80">
          Espees sent you back with “{result}” — the verified status is below.
        </p>
      )}
      <div className="mt-4 space-y-3">
        <ErrorText message={error} />
        {!payment ? (
          <Muted>Loading payment…</Muted>
        ) : (
          <Card>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {payment.amount_espees} ESP · {payment.narration}
              </p>
              <StatusPill value={payment.status} />
            </div>
            {payment.status_detail && (
              <p className="mt-1 text-xs text-body/80">{payment.status_detail}</p>
            )}
            <NoticeText
              message={
                payment.status === "completed"
                  ? `Confirmed${payment.customer_username ? ` as ${payment.customer_username}` : ""}.`
                  : null
              }
            />
            {payment.status !== "completed" && payment.status !== "failed" && (
              <button
                onClick={() => void check()}
                disabled={checking}
                className="mt-3 w-full rounded-lg border border-border px-4 py-2 text-sm text-ink hover:border-royal/40 disabled:opacity-50"
              >
                {checking ? "Confirming…" : "Check confirmation status"}
              </button>
            )}
          </Card>
        )}
        <button
          onClick={backToApp}
          className="w-full rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep"
        >
          Back to app
        </button>
      </div>
    </main>
  );
}
