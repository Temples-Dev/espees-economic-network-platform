import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import type { NavItem } from "@/components/layout/sidebar";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  brand,
  items,
  sidebarFooter,
  topBar,
  children,
}: {
  brand: ReactNode;
  items: NavItem[];
  sidebarFooter?: ReactNode;
  topBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar brand={brand} items={items} footer={sidebarFooter} />
      <div className="flex min-w-0 flex-1 flex-col">
        {topBar && (
          <header className="flex h-16 shrink-0 items-center justify-between bg-paper px-4 lg:px-8">
            {topBar}
          </header>
        )}
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav items={items} />
    </div>
  );
}
