import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "border-border bg-paper text-body",
      success: "border-emerald-200 bg-emerald-50 text-emerald-700",
      warning: "border-amber-200 bg-amber-50 text-amber-700",
      danger: "border-red-200 bg-red-50 text-red-700",
      brand: "border-royal/20 bg-surface-selected text-royal",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  associated: "success",
  completed: "success",
  fulfilled: "success",
  active: "success",
  confirmed: "success",
  pending: "warning",
  pending_external: "warning",
  provisioning: "warning",
  initiated: "warning",
  requires_action: "warning",
  attention: "warning",
  failed: "danger",
  declined: "danger",
  cancelled: "danger",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={STATUS_TONE[value] ?? "neutral"}>{value.replace(/_/g, " ")}</Badge>;
}
