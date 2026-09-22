import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/cn";

export function MobileNav({ items }: { items: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-body",
              isActive && "text-royal",
            )
          }
        >
          <item.icon className="h-5 w-5" strokeWidth={2} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
