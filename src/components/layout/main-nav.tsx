"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Item menu utama aplikasi — satu sumber untuk sidebar desktop & sheet mobile. */
export type MainNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stock/bahan-baku", label: "Master Data", icon: Package },
  { href: "/expenses", label: "Belanja harian", icon: ShoppingCart },
  { href: "/penjualan", label: "List Penjualan", icon: Store },
  { href: "/invoice-exchange", label: "Penukaran faktur", icon: Receipt },
  { href: "/receivables", label: "Piutang", icon: Wallet },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

export function isMainNavActive(pathname: string, href: string): boolean {
  if (href === "/stock/bahan-baku") return pathname.startsWith("/stock");
  if (href === "/penjualan") return pathname.startsWith("/penjualan");
  return pathname === href || pathname.startsWith(`${href}/`);
}

type MainNavBrandProps = { className?: string };

export function MainNavBrand({ className }: MainNavBrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-sidebar-foreground ring-1 ring-white/15">
        <Building2 className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight text-sidebar-foreground">
          Executive Architect
        </p>
        <p className="text-xs text-sidebar-foreground/70">Operasi bisnis</p>
      </div>
    </div>
  );
}

type MainNavLinksProps = {
  pathname: string;
  /** Dipanggil setelah navigasi (mis. menutup sheet mobile). */
  onNavigate?: () => void;
};

export function MainNavLinks({ pathname, onNavigate }: MainNavLinksProps) {
  return (
    <nav className="relative flex flex-1 flex-col gap-1 p-3" aria-label="Menu utama">
      {MAIN_NAV_ITEMS.map((item) => {
        const active = isMainNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground ring-1 ring-white/15"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-white/15 text-sidebar-primary-foreground"
                  : "bg-sidebar-accent text-sidebar-foreground/80",
              )}
            >
              <Icon className="size-4" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MainNavFooter({ className }: { className?: string }) {
  return (
    <div className={cn("border-t border-sidebar-border px-5 py-4", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
        EA HQ Enterprise
      </p>
      <p className="mt-0.5 text-xs text-sidebar-foreground/50">v1.0 · konsol operasi</p>
    </div>
  );
}
