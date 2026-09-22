import { Radio, X } from "lucide-react";
import { useEffect, useState } from "react";

import { IconChip, ICON_CHIP_ROTATION } from "@/components/ui/icon-chip";

import { errorMessage } from "../lib/api";
import type { Campaign } from "../lib/catalog";
import { contributeToCampaign, getCampaign, listCampaigns } from "../lib/catalog";
import { Card, ErrorText, Field, Muted, NoticeText, PrimaryButton, StatusPill, inputClass } from "./ui";

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    listCampaigns()
      .then(setCampaigns)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load campaigns.")));
  }, []);

  async function open(id: string) {
    setError(null);
    setNotice(null);
    try {
      setSelected(await getCampaign(id));
    } catch (err) {
      setError(errorMessage(err, "Could not load campaign."));
    }
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await contributeToCampaign(selected.id, amount.trim(), note.trim());
      setNotice("Contribution recorded. Settlement follows the confirmed Espees flow.");
      setAmount("");
      setNote("");
      setSelected(await getCampaign(selected.id));
      setCampaigns(await listCampaigns());
    } catch (err) {
      setError(errorMessage(err, "Contribution failed."));
    } finally {
      setBusy(false);
    }
  }

  function progress(c: Campaign): number {
    const raised = parseFloat(c.raised_espees ?? "0");
    const goal = parseFloat(c.goal_espees || "1");
    if (!goal) return 0;
    return Math.min(100, Math.round((raised / goal) * 100));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Campaigns</h2>
        <p className="mt-1 text-sm text-body">Fundraisers running across the network.</p>
      </div>

      <ErrorText message={error} />
      {campaigns.length === 0 ? (
        <Card>
          <Muted>No campaigns yet.</Muted>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {campaigns.map((c, i) => (
            <button key={c.id} onClick={() => void open(c.id)} className="block text-left">
              <Card className="flex h-full items-start gap-3">
                <IconChip icon={Radio} tone={ICON_CHIP_ROTATION[i % ICON_CHIP_ROTATION.length]} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-ink">{c.title}</p>
                    <StatusPill value={c.status} />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${progress(c)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-body/80">
                    {c.raised_espees ?? "0"} / {c.goal_espees} ESP · {progress(c)}%
                    {c.contribution_count != null ? ` · ${c.contribution_count} contributions` : ""}
                  </p>
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
              <IconChip icon={Radio} tone="royal" />
              <div>
                <h3 className="font-medium text-ink">{selected.title}</h3>
                <p className="text-sm text-body">{selected.description || "No description."}</p>
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
          <p className="mt-3 text-sm text-ink/80">
            {selected.raised_espees ?? "0"} / {selected.goal_espees} ESP raised
          </p>
          {selected.status === "active" ? (
            <form onSubmit={contribute} className="mt-3 space-y-3">
              <Field label="Amount (ESP)">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  required
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                  className={inputClass}
                />
              </Field>
              <Field label="Note (optional)">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Good luck!"
                  maxLength={300}
                  className={inputClass}
                />
              </Field>
              <ErrorText message={error} />
              <NoticeText message={notice} />
              <PrimaryButton disabled={busy}>{busy ? "Contributing…" : "Contribute"}</PrimaryButton>
            </form>
          ) : (
            <Muted>This campaign is not accepting contributions.</Muted>
          )}
        </Card>
      )}
    </div>
  );
}
