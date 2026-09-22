import { useEffect, useState } from "react";

import { errorMessage } from "../lib/api";
import type { Capabilities, Payment, WalletAssociation } from "../lib/money";
import { getWallet, linkWallet, listPayments } from "../lib/money";
import { Card, ErrorText, Field, Muted, NoticeText, PrimaryButton, StatusPill, inputClass } from "./ui";

function CapabilityRow({ label, available, hint }: { label: string; available: boolean; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {!available && <p className="text-xs text-body/80">{hint}</p>}
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          available ? "bg-emerald-50 text-emerald-700" : "bg-border text-body"
        }`}
      >
        {available ? "Available" : "Coming soon"}
      </span>
    </div>
  );
}

export function Wallet() {
  const [wallet, setWallet] = useState<WalletAssociation | null>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const data = await getWallet();
    setWallet(data.wallet);
    setCaps(data.capabilities);
    setPayments(await listPayments());
  }

  useEffect(() => {
    refresh().catch((err: unknown) => setError(errorMessage(err, "Could not load wallet.")));
  }, []);

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const updated = await linkWallet(address.trim());
      setWallet(updated);
      setAddress("");
      setNotice("Address claimed. Staff verification is pending before it is trusted.");
      const data = await getWallet();
      setCaps(data.capabilities);
    } catch (err) {
      setError(errorMessage(err, "Linking failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Espees wallet</h3>
          {wallet && <StatusPill value={wallet.status} />}
        </div>
        {wallet ? (
          <div className="mt-2 space-y-1 text-sm">
            <p className="break-all text-ink/80">
              {wallet.espees_wallet_address || "No address linked yet."}
            </p>
            {wallet.status_detail && <p className="text-xs text-body/80">{wallet.status_detail}</p>}
            <p className="text-xs text-body/80">
              Espees is the authoritative ledger — this page shows the platform association only,
              never an invented balance.
            </p>
          </div>
        ) : (
          <Muted>Loading…</Muted>
        )}
      </Card>

      {wallet && wallet.status !== "associated" && (
        <Card>
          <h3 className="font-medium">Link your Espees wallet</h3>
          <p className="mt-1 text-xs text-body/80">
            Enter the address of your existing Espees wallet. It stays unverified until staff
            confirm it.
          </p>
          <form onSubmit={submitLink} className="mt-3 space-y-3">
            <Field label="Wallet address (0x…)">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x…"
                required
                className={`${inputClass} font-mono`}
              />
            </Field>
            <ErrorText message={error} />
            <NoticeText message={notice} />
            <PrimaryButton disabled={busy}>{busy ? "Linking…" : "Claim address"}</PrimaryButton>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="font-medium">Capabilities</h3>
        {caps ? (
          <div className="mt-1 divide-y divide-border">
            <CapabilityRow label="Balance" available={caps.BALANCE_AVAILABLE} hint="Awaiting the official Espees User API." />
            <CapabilityRow label="Fund" available={caps.FUNDING_AVAILABLE} hint="Awaiting an authorized settlement mechanism." />
            <CapabilityRow label="Pay" available={caps.PAYMENT_AVAILABLE} hint="Merchant payments are not configured yet." />
            <CapabilityRow label="Receive" available={caps.RECEIVING_AVAILABLE} hint="Awaiting the official Espees User API." />
            <CapabilityRow label="Withdraw" available={caps.WITHDRAWAL_AVAILABLE} hint="Awaiting an official redemption mechanism." />
          </div>
        ) : (
          <Muted>Loading…</Muted>
        )}
      </Card>

      <div>
        <h3 className="mb-2 font-medium">Platform activity</h3>
        <p className="mb-2 text-xs text-body/80">
          Payments initiated through this platform. Activity elsewhere in Espees is not shown
          here.
        </p>
        {payments.length === 0 ? (
          <Muted>No platform payments yet.</Muted>
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
                <p className="mt-1 text-xs text-body/80">
                  {new Date(p.created_at).toLocaleString()}
                  {p.customer_username ? ` · paid as ${p.customer_username}` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
