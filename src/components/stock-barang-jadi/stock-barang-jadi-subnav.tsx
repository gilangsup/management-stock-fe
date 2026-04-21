"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/stock-barang-jadi/masuk", label: "Stock barang masuk" },
  { href: "/stock-barang-jadi/keluar", label: "Stock barang keluar" },
  { href: "/stock-barang-jadi/riwayat", label: "Riwayat stok" },
] as const;

export function StockBarangJadiSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-border pb-4"
      aria-label="Submenu stok barang jadi"
    >
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
