import { Building2, CreditCard, LayoutGrid, LogOut, ShoppingBag, Smartphone, User as UserIcon, Wallet } from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { BrandMark } from "@/components/layout/brand-mark";
import type { NavItem } from "@/components/layout/sidebar";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { signOut } from "../lib/api";
import type { User } from "../lib/auth";
import { Account } from "./Account";
import { Categories } from "./Categories";
import { Orders } from "./Orders";
import { Overview } from "./Overview";
import { Sessions } from "./Sessions";
import { Wallets } from "./Wallets";

const NAV: NavItem[] = [
  { to: "/staff", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/staff/orders", label: "Orders", icon: ShoppingBag },
  { to: "/staff/wallets", label: "Wallets", icon: Wallet },
  { to: "/staff/categories", label: "Categories", icon: Building2 },
  { to: "/staff/sessions", label: "Sessions", icon: Smartphone },
  { to: "/staff/account", label: "Account", icon: UserIcon },
];

const TITLES: Record<string, string> = {
  "/staff": "Overview",
  "/staff/orders": "Orders",
  "/staff/wallets": "Wallets",
  "/staff/categories": "Categories",
  "/staff/sessions": "Sessions",
  "/staff/account": "Account",
};

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark className="ring-1 ring-white/15" />
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">EENP Admin</p>
          <p className="text-xs text-white/60">Staff console</p>
        </div>
      )}
    </div>
  );
}

export function StaffApp({ user, onSignedOut }: { user: User; onSignedOut: () => void }) {
  const navigate = useNavigate();
  const title = TITLES[useLocation().pathname] ?? "EENP Admin";

  return (
    <AppShell
      brand={(collapsed) => <Brand collapsed={collapsed} />}
      items={NAV}
      sidebarFooter={(collapsed) => (
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center px-0" : "px-2")}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-gold text-deep">{initials(user.full_name || user.email)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.full_name || user.email}</p>
                <p className="truncate text-xs text-white/55">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => void signOut().then(onSignedOut)}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
      topBar={
        <>
          <h1 className="text-lg font-semibold text-ink">{title}</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/app")}>
            <CreditCard className="h-4 w-4" />
            Member view
          </Button>
        </>
      }
    >
      <Routes>
        <Route index element={<Overview user={user} />} />
        <Route path="orders" element={<Orders />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="categories" element={<Categories />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="account" element={<Account user={user} onSignedOut={onSignedOut} />} />
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </AppShell>
  );
}
