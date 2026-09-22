import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

const TONES = {
  royal: "bg-surface-selected text-royal",
  gold: "bg-[#FBF1DE] text-[#9c7c3a]",
  bronze: "bg-[#F1E9E1] text-bronze",
  emerald: "bg-emerald-50 text-emerald-700",
} as const;

export type IconChipTone = keyof typeof TONES;

export const ICON_CHIP_ROTATION: IconChipTone[] = ["royal", "gold", "bronze", "emerald"];

export function IconChip({
  icon: Icon,
  tone = "royal",
  size = 44,
  className,
}: {
  icon: LucideIcon;
  tone?: IconChipTone;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-xl", TONES[tone], className)}
      style={{ width: size, height: size }}
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </div>
  );
}
