import { useEffect, useState } from "react";

import { errorMessage } from "../lib/api";
import type { Business, Offering } from "../lib/catalog";
import { listBusinesses, listOfferings } from "../lib/catalog";
import { Card, ErrorText, Muted, StatusPill, inputClass } from "./ui";

export function Discover() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState<Business | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    listOfferings(b.id)
      .then(setOfferings)
      .catch((err: unknown) => setError(errorMessage(err, "Could not load offerings.")));
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
              {offerings.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-zinc-950 p-3">
                  <div>
                    <p className="text-sm font-medium">{o.name}</p>
                    <p className="text-xs text-zinc-500">{o.kind}</p>
                  </div>
                  <p className="text-sm font-medium">{o.price} ESP</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
