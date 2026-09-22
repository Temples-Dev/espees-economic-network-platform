import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">{children}</div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm";

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "submit",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white hover:bg-deep disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "associated" || value === "completed" || value === "active"
      ? "border-emerald-700 bg-emerald-950 text-emerald-300"
      : value === "pending" ||
          value === "pending_external" ||
          value === "provisioning" ||
          value === "initiated"
        ? "border-amber-700 bg-amber-950 text-amber-300"
        : value === "failed" || value === "declined"
          ? "border-red-700 bg-red-950 text-red-300"
          : "border-zinc-700 bg-zinc-800 text-zinc-300";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function NoticeText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-emerald-400">{message}</p>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-500">{children}</p>;
}
