import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";

import { api, errorMessage } from "../lib/api";
import type { SessionRow } from "./types";

export function Sessions() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ sessions: SessionRow[] }>("/api/v1/auth/sessions/")
      .then((d) => setRows(d.sessions))
      .catch((err: unknown) => setError(errorMessage(err, "Could not load sessions.")));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-body">No sign-in activity.</p>;
  return (
    <div className="space-y-3">
      {rows.map((s, i) => (
        <Card key={`${s.device_key}-${s.created_at}-${i}`} className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-selected text-royal">
            <Monitor className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink">
              Device {s.device_key ? s.device_key.slice(0, 12) : "unknown"}
            </p>
            <p className="text-sm text-body">
              {s.ip_address ?? "unknown IP"} · {new Date(s.created_at).toLocaleString()}
            </p>
            <p className="truncate text-xs text-body/70">{s.user_agent || "unknown browser"}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
