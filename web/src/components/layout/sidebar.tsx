import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/cn";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export function Sidebar({
  brand,
  items,
  footer,
}: {
  brand: React.ReactNode;
  items: NavItem[];
  footer?: React.ReactNode;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="px-2">{brand}</div>
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-body transition-all",
                "hover:bg-paper hover:text-ink",
                isActive &&
                  "bg-royal text-white shadow-[0_6px_16px_-6px_rgba(24,55,156,0.55)] hover:bg-royal hover:text-white",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {footer && <div className="mt-4 border-t border-border pt-4">{footer}</div>}
    </aside>
  );
}
