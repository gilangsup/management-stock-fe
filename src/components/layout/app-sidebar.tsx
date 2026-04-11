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
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dasbor", icon: LayoutDashboard },
  { href: "/stock", label: "Manajemen stok", icon: Package },
  { href: "/expenses", label: "Pengeluaran harian", icon: ShoppingCart },
  { href: "/invoice-exchange", label: "Penukaran faktur", icon: Receipt },
  { href: "/receivables", label: "Piutang", icon: Wallet },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative flex w-64 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 text-slate-100 shadow-xl shadow-indigo-950/50">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(99,102,241,0.12)_0%,transparent_45%)]"
        aria-hidden
      />
      <div className="relative flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-600 text-white shadow-lg shadow-indigo-500/40">
          <Building2 className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">Executive Architect</p>
          <p className="text-xs text-indigo-200/80">Operasi bisnis</p>
        </div>
      </div>
      <nav className="relative flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-sky-500/25 to-violet-600/25 text-white shadow-inner ring-1 ring-white/15"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-md"
                    : "bg-white/5 text-slate-300",
                )}
              >
                <Icon className="size-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="relative border-t border-white/10 px-5 py-4">
        <p className="text-[10px] font-medium tracking-wider text-indigo-300/90 uppercase">
          EA HQ Enterprise
        </p>
        <p className="mt-0.5 text-xs text-slate-500">v1.0 · konsol operasi</p>
      </div>
    </aside>
  );
}
