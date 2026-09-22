import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { AuthSplit } from "@/components/layout/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { api, errorMessage } from "../lib/api";
import type { User } from "../lib/auth";
import { SocialAuthRow } from "./SocialAuthRow";

type View = "login" | "register" | "code" | "reset";

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
  );
}

export function AuthPage({ onDone }: { onDone: (u: User) => void }) {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishWithTokens(pair: { access: string; refresh: string }) {
    api.setTokens(pair.access, pair.refresh);
    onDone(await api.get<User>("/api/v1/me/"));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (view === "register") {
        await api.post("/api/v1/auth/register/", { email, password });
      }
      const body = await api.post<{ access?: string; refresh?: string; two_factor_required?: boolean }>(
        "/api/v1/auth/login/",
        { email, password },
      );
      if (body.two_factor_required) {
        setView("code");
        return;
      }
      await finishWithTokens(body as { access: string; refresh: string });
    } catch (err) {
      setError(errorMessage(err, view === "login" ? "Sign-in failed." : "Sign-up failed."));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const pair = await api.post<{ access: string; refresh: string }>("/api/v1/auth/login/2fa/", {
        email,
        code,
      });
      setCode("");
      await finishWithTokens(pair);
    } catch (err) {
      setError(errorMessage(err, "Invalid code."));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/v1/auth/password-reset/", { email });
      setResetSent(true);
    } catch {
      setError("Request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      {view === "reset" ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">Reset your password</h2>
          <p className="mt-1 text-sm text-body">Enter your account email and we'll send a reset link.</p>
          {resetSent ? (
            <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              If the account exists, a reset email has been sent.
            </p>
          ) : (
            <form onSubmit={(e) => void submitReset(e)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <ErrorBanner message={error} />
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}
          <button
            onClick={() => {
              setView("login");
              setResetSent(false);
              setError(null);
            }}
            className="mt-5 w-full text-sm text-body hover:text-ink"
          >
            Back to sign-in
          </button>
        </div>
      ) : view === "code" ? (
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-selected text-royal">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Check your authenticator</h2>
          <p className="mt-1 text-sm text-body">Enter the 6-digit code to finish signing in.</p>
          <form onSubmit={(e) => void submitCode(e)} className="mt-6 space-y-4">
            <Input
              required
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-xl tracking-[0.4em]"
              autoComplete="one-time-code"
            />
            <ErrorBanner message={error} />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setView("login");
                setCode("");
                setError(null);
              }}
              className="w-full text-sm text-body hover:text-ink"
            >
              Back to sign-in
            </button>
          </form>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-semibold text-ink">
            {view === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-body">
            {view === "login"
              ? "Sign in to your Espees Economic Network account."
              : "Set up your EENP account to get started."}
          </p>
          <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">{view === "login" ? "Password" : "Choose a password"}</Label>
                {view === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("reset");
                      setError(null);
                    }}
                    className="text-xs font-medium text-royal hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={view === "login" ? "current-password" : "new-password"}
              />
            </div>
            <ErrorBanner message={error} />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? "Working…" : view === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <SocialAuthRow />
          <button
            onClick={() => {
              setView(view === "login" ? "register" : "login");
              setError(null);
            }}
            className="mt-6 w-full text-center text-sm text-body"
          >
            {view === "login" ? (
              <>
                New to EENP? <span className="font-semibold text-royal">Create an account</span>
              </>
            ) : (
              <>
                Already have an account? <span className="font-semibold text-royal">Sign in</span>
              </>
            )}
          </button>
        </div>
      )}
    </AuthSplit>
  );
}
