import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { api, errorMessage } from "../lib/api";
import type { WalletRow } from "./types";

const FILTERS = ["requires_action", "attention", "associated", "pending_external"] as const;

export function Wallets() {
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("requires_action");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function refresh(nextFilter: string) {
    return api
      .getList<WalletRow>(`/api/v1/wallets/?status=${nextFilter}`)
      .then(setRows)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load wallet queue.")));
  }

  useEffect(() => {
    void refresh(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function verify(row: WalletRow) {
    setError(null);
    setNotice(null);
    setBusy(row.user_id);
    try {
      await api.post("/api/v1/wallet/verify/", { user_id: row.user_id });
      setNotice(`Verified wallet for ${row.user_email}.`);
      await refresh(filter);
    } catch (err) {
      setError(errorMessage(err, "Verification failed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "primary" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-body">Queue empty.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <p className="font-medium text-ink">{r.user_email}</p>
              <p className="mt-1 break-all font-mono text-xs text-body">{r.espees_wallet_address}</p>
              <p className="mt-1 text-xs text-body/80">
                {r.status.replace(/_/g, " ")} · claimed {new Date(r.updated_at).toLocaleString()}
              </p>
              {r.status !== "associated" && (
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={busy !== null}
                  onClick={() => void verify(r)}
                >
                  {busy === r.user_id ? "Verifying…" : "Verify address"}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
