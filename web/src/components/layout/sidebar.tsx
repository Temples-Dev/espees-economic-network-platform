import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/cn";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const STORAGE_KEY = "eenp.sidebar.collapsed";

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function Sidebar({
  brand,
  items,
  footer,
}: {
  brand: (collapsed: boolean) => ReactNode;
  items: NavItem[];
  footer?: (collapsed: boolean) => ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* private mode, etc. */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col rounded-[28px] bg-royal py-6 transition-[width] duration-200 lg:my-4 lg:ml-4 lg:flex",
        collapsed ? "w-20 px-2" : "w-64 px-4",
      )}
    >
      <div className={cn("flex items-center", collapsed && "justify-center")}>{brand(collapsed)}</div>
      <nav className="mt-8 flex flex-1 flex-col gap-1.5">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-white/65 transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                "hover:bg-white/10 hover:text-white",
                isActive && "bg-gold text-deep hover:bg-gold hover:text-deep",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "mt-2 flex items-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white",
          collapsed ? "justify-center px-0" : "px-3",
        )}
      >
        {collapsed ? <ChevronRight className="h-[18px] w-[18px]" /> : <ChevronLeft className="h-[18px] w-[18px]" />}
        {!collapsed && "Collapse"}
      </button>
      {footer && <div className="mt-4 border-t border-white/10 pt-4">{footer(collapsed)}</div>}
    </aside>
  );
}
