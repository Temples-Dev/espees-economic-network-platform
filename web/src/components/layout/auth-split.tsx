import type { ReactNode } from "react";

import { BrandMark } from "@/components/layout/brand-mark";

export function AuthSplit({
  eyebrow,
  title,
  description,
  steps,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps?: Array<{ label: string; active: boolean }>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-paper">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-royal via-deep to-[#081d63] p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          <BrandMark className="ring-1 ring-white/25" />
          <span className="text-lg font-semibold tracking-tight">EENP</span>
        </div>
        <div className="relative">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            {eyebrow}
          </span>
          <h1 className="mt-5 max-w-sm text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 max-w-sm text-sm text-white/70">{description}</p>
          {steps && (
            <div className="mt-8 flex gap-3">
              {steps.map((step, i) => (
                <div
                  key={step.label}
                  className={
                    "flex-1 rounded-xl border p-3 text-xs " +
                    (step.active
                      ? "border-white/40 bg-white/15 text-white"
                      : "border-white/10 bg-white/5 text-white/50")
                  }
                >
                  <span
                    className={
                      "mb-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold " +
                      (step.active ? "bg-gold text-deep" : "bg-white/15 text-white/60")
                    }
                  >
                    {i + 1}
                  </span>
                  {step.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="relative text-xs text-white/40">Espees Economic Network Platform</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
