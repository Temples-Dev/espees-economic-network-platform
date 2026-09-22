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
    <aside className="hidden w-64 shrink-0 flex-col rounded-[28px] bg-royal px-4 py-6 lg:my-4 lg:ml-4 lg:flex">
      <div className="px-2">{brand}</div>
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition-colors",
                "hover:bg-white/10 hover:text-white",
                isActive && "bg-gold text-deep hover:bg-gold hover:text-deep",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {footer && <div className="mt-4 border-t border-white/10 pt-4">{footer}</div>}
    </aside>
  );
}
