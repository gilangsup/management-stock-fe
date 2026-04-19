"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stock/bahan-baku", label: "Master Data", icon: Package },
  { href: "/expenses", label: "Belanja harian", icon: ShoppingCart },
  { href: "/penjualan", label: "List Penjualan", icon: Store },
  { href: "/invoice-exchange", label: "Penukaran faktur", icon: Receipt },
  { href: "/receivables", label: "Piutang", icon: Wallet },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm shadow-black/20">
      <div className="relative flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
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
      <nav className="relative flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
          const active =
            item.href === "/stock/bahan-baku"
              ? pathname.startsWith("/stock")
              : item.href === "/penjualan"
                ? pathname.startsWith("/penjualan")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="relative border-t border-sidebar-border px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
          EA HQ Enterprise
        </p>
        <p className="mt-0.5 text-xs text-sidebar-foreground/50">v1.0 · konsol operasi</p>
      </div>
    </aside>
  );
}
