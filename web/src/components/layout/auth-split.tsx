import { Building2, MessagesSquare, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/cn";

type Slide = { eyebrow: string; title: string; copy: string; icon: typeof Building2 };

const SLIDES: Slide[] = [
  {
    eyebrow: "Discover & build",
    title: "Businesses",
    copy: "Find trusted member businesses, products and suppliers, or start and grow your own with customers already on the network.",
    icon: Building2,
  },
  {
    eyebrow: "Send & receive",
    title: "Payments",
    copy: "Pay people, businesses and campaigns in Espees. Fund your wallet and withdraw through your local payment options.",
    icon: Wallet,
  },
  {
    eyebrow: "Connect & fund",
    title: "Community",
    copy: "Talk with the people you trade with, and back community projects that create new economic activity.",
    icon: MessagesSquare,
  },
];

export function AuthSplit({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  const slide = SLIDES[index]!;

  return (
    <div className="flex min-h-screen bg-paper">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-royal via-deep to-[#081d63] p-10 text-white lg:my-4 lg:ml-4 lg:flex lg:rounded-[28px]">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5">
          <BrandMark className="ring-1 ring-white/15" />
          <span className="text-lg font-semibold tracking-tight">EENP</span>
        </div>

        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <slide.icon className="h-6 w-6 text-gold" strokeWidth={1.75} />
          </div>
          <span className="mt-6 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            {slide.eyebrow}
          </span>
          <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight">{slide.title}</h1>
          <p className="mt-3 max-w-sm text-sm text-white/70">{slide.copy}</p>

          <div className="mt-7 flex gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                aria-label={`Show ${s.title}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-7 bg-gold" : "w-1.5 bg-white/25 hover:bg-white/40",
                )}
              />
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">Espees Economic Network Platform</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
