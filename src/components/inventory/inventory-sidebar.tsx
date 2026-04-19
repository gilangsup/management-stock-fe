"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hotel, Layers, Ruler, Tags, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

const inventori = [
  { href: "/stock/bahan-baku", label: "Bahan baku", icon: Wheat },
  { href: "/stock/barang-jadi", label: "Barang jadi", icon: Tags },
  { href: "/stock/harga-hotel", label: "Harga hotel", icon: Hotel },
];

const kategori = [
  { href: "/stock/satuan", label: "Satuan", icon: Ruler },
  { href: "/stock/kategori-barang", label: "Kategori barang", icon: Layers },
];

export function InventorySidebar() {
  const pathname = usePathname();

  return (
    <nav
      className="surface-panel w-full shrink-0 space-y-6 rounded-2xl p-4 md:w-56"
      aria-label="Menu inventori"
    >
      <div>
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-primary/90">
          Master Inventori
        </p>
        <ul className="space-y-1">
          {inventori.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground shadow-inner ring-1 ring-border dark:bg-muted/80"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-border pt-4">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-primary/90">
          Master Kategori
        </p>
        <ul className="space-y-1">
          {kategori.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground shadow-inner ring-1 ring-border dark:bg-muted/80"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
