import { useState } from "react";
import type { FormEvent } from "react";

import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api, errorMessage, signOut } from "../lib/api";
import type { User } from "../lib/auth";

export function Account({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ detail: string }>("/api/v1/auth/change-password/", {
        old_password: current,
        new_password: next,
      });
      await signOut();
      setNotice(`${res.detail} Please sign in again.`);
      onSignedOut();
    } catch (err) {
      setError(errorMessage(err, "Password change failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <Card className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{initials(user.full_name || user.email)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-ink">{user.full_name || user.email}</p>
          <p className="text-sm text-body">{user.email}</p>
          <div className="mt-1.5 flex gap-1.5">
            <Badge tone="brand">Staff</Badge>
            <Badge tone={user.is_verified ? "success" : "neutral"}>
              {user.is_verified ? "verified" : "unverified"}
            </Badge>
          </div>
        </div>
      </Card>
      <Card>
        <form onSubmit={(e) => void changePassword(e)} className="space-y-4">
          <div>
            <h3 className="font-medium text-ink">Change password</h3>
            <p className="mt-0.5 text-xs text-body">This signs out all other sessions immediately.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-emerald-600">{notice}</p>}
          <Button className="w-full" disabled={busy}>
            {busy ? "Working…" : "Change password"}
          </Button>
        </form>
      </Card>
      <Button variant="destructive" className="w-full" onClick={() => void signOut().then(onSignedOut)}>
        Sign out
      </Button>
    </div>
  );
}
