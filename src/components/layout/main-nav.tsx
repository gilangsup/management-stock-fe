"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Role yang dikenali di sisi frontend. */
export type AppRole = "admin" | "user" | "staff";

/** Item menu utama aplikasi — satu sumber untuk sidebar desktop & sheet mobile. */
export type MainNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Role yang boleh melihat item ini.
   * Jika undefined → semua role bisa melihat.
   */
  allowedRoles?: AppRole[];
};

/** Daftar route yang boleh diakses role 'staff'. */
export const STAFF_ALLOWED_PATHS = ["/expenses", "/stock-barang-jadi"];

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "user"],
  },
  {
    href: "/stock/bahan-baku",
    label: "Master Data",
    icon: Package,
    allowedRoles: ["admin", "user"],
  },
  { href: "/stock-barang-jadi", label: "Stock barang jadi", icon: Boxes },
  { href: "/expenses", label: "Belanja harian", icon: ShoppingCart },
  {
    href: "/pesanan-harian",
    label: "Pesanan harian",
    icon: ClipboardList,
    allowedRoles: ["admin", "user"],
  },
  {
    href: "/penjualan",
    label: "List Penjualan",
    icon: Store,
    allowedRoles: ["admin", "user"],
  },
  {
    href: "/invoice-exchange",
    label: "Penukaran faktur",
    icon: Receipt,
    allowedRoles: ["admin", "user"],
  },
  {
    href: "/receivables",
    label: "Piutang",
    icon: Wallet,
    allowedRoles: ["admin", "user"],
  },
  {
    href: "/reports",
    label: "Laporan",
    icon: BarChart3,
    allowedRoles: ["admin", "user"],
  },
];

/** Kembalikan daftar item yang boleh dilihat oleh role tertentu. */
export function getNavItemsForRole(role: string | undefined): MainNavItem[] {
  return MAIN_NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role as AppRole),
  );
}

export function isMainNavActive(pathname: string, href: string): boolean {
  if (href === "/stock/bahan-baku") {
    return pathname.startsWith("/stock") && !pathname.startsWith("/stock-barang-jadi");
  }
  if (href === "/stock-barang-jadi") return pathname.startsWith("/stock-barang-jadi");
  if (href === "/penjualan") return pathname.startsWith("/penjualan");
  if (href === "/pesanan-harian") return pathname.startsWith("/pesanan-harian");
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
  role?: string;
  /** Dipanggil setelah navigasi (mis. menutup sheet mobile). */
  onNavigate?: () => void;
};

export function MainNavLinks({ pathname, role, onNavigate }: MainNavLinksProps) {
  const items = getNavItemsForRole(role);
  return (
    <nav className="relative flex flex-1 flex-col gap-1 p-3" aria-label="Menu utama">
      {items.map((item) => {
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
