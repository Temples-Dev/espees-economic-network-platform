import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Card as BaseCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <BaseCard className={className}>{children}</BaseCard>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <Label>{label}</Label>
      <div>{children}</div>
    </label>
  );
}

export const inputClass = cn(
  "h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-ink placeholder:text-body/60",
  "transition-colors focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/15",
);

// Kept for member pages that render <input className={inputClass} /> directly rather than
// via the Input component; both paths resolve to the same visual class list.
export { Input };

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "submit",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: ButtonProps["type"];
}) {
  return (
    <Button type={type} disabled={disabled} onClick={onClick} size="lg" className="w-full">
      {children}
    </Button>
  );
}

export function StatusPill({ value }: { value: string }) {
  return <StatusBadge value={value} />;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
  );
}

export function NoticeText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {message}
    </p>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-body">{children}</p>;
}
