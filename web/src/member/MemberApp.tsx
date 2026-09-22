import { CreditCard, Home as HomeIcon, LogOut, Radio, Search, ShoppingBag, Wallet as WalletIcon } from "lucide-react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { BrandMark } from "@/components/layout/brand-mark";
import type { NavItem } from "@/components/layout/sidebar";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import type { User } from "../lib/auth";
import { Campaigns } from "./Campaigns";
import { Discover } from "./Discover";
import { Home } from "./Home";
import { Orders } from "./Orders";
import { Pay } from "./Pay";
import { Wallet } from "./Wallet";

type Tab = "home" | "wallet" | "pay" | "discover" | "orders" | "campaigns";

export type MemberTab = Tab;

const TAB_PATH: Record<Tab, string> = {
  home: "/app",
  wallet: "/app/wallet",
  pay: "/app/pay",
  discover: "/app/discover",
  orders: "/app/orders",
  campaigns: "/app/campaigns",
};

const NAV: NavItem[] = [
  { to: "/app", label: "Home", icon: HomeIcon, end: true },
  { to: "/app/discover", label: "Discover", icon: Search },
  { to: "/app/pay", label: "Pay", icon: CreditCard },
  { to: "/app/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/app/orders", label: "Orders", icon: ShoppingBag },
  { to: "/app/campaigns", label: "Campaigns", icon: Radio },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark className="ring-1 ring-white/15" />
      <p className="text-sm font-semibold text-white">EENP</p>
    </div>
  );
}

export function MemberApp({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const navigate = useNavigate();
  const onGo = (tab: Tab) => navigate(TAB_PATH[tab]);

  return (
    <AppShell
      brand={<Brand />}
      items={NAV}
      sidebarFooter={
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-gold text-deep">{initials(user.full_name || user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.full_name || user.email}</p>
            <p className="truncate text-xs text-white/55">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <Routes>
        <Route index element={<Home user={user} onGo={onGo} />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="pay" element={<Pay />} />
        <Route path="discover" element={<Discover onGo={onGo} />} />
        <Route path="orders" element={<Orders />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </AppShell>
  );
}
