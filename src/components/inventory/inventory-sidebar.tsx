"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hotel, History, Layers, Ruler, Tags, Upload, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarLink = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Jika true, hanya cocok path persis (memisahkan /stock/barang-jadi dari sub-rute). */
  exact?: boolean;
  /** Jika true, tampilkan sebagai sub-item (indented, icon lebih kecil). */
  sub?: boolean;
};

const masterInventori: SidebarLink[] = [
  { href: "/stock/bahan-baku", label: "Bahan baku", icon: Wheat },
  { href: "/stock/barang-jadi", label: "Barang jadi", icon: Tags, exact: true },
  { href: "/stock/barang-jadi/riwayat", label: "Riwayat stok", icon: History, sub: true },
  { href: "/stock/harga-hotel", label: "Harga hotel", icon: Hotel },
  { href: "/stock/bulk-master", label: "Bulk master", icon: Upload },
];

const kategori: SidebarLink[] = [
  { href: "/stock/satuan", label: "Satuan", icon: Ruler },
  { href: "/stock/kategori-barang", label: "Kategori barang", icon: Layers },
];

function linkActive(pathname: string, item: SidebarLink): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarLinkList({ items }: { items: SidebarLink[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = linkActive(pathname, item);
        const Icon = item.icon;
        return (
          <li key={item.href} className={item.sub ? "pl-4" : undefined}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                item.sub && "text-[13px]",
                active
                  ? "bg-muted text-foreground shadow-inner ring-1 ring-border dark:bg-muted/80"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon
                className={cn("shrink-0 opacity-80", item.sub ? "size-3.5" : "size-4")}
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function InventorySidebar() {
  return (
    <nav
      className="surface-panel w-full shrink-0 space-y-6 rounded-2xl p-4 md:w-56"
      aria-label="Menu inventori"
    >
      <div>
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-primary/90">
          Master Inventori
        </p>
        <SidebarLinkList items={masterInventori} />
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-primary/90">
          Master Kategori
        </p>
        <SidebarLinkList items={kategori} />
      </div>
    </nav>
  );
}
