"use client";

import { AppShell } from "@/components/layout/app-shell";
import { StockBarangJadiSubnav } from "@/components/stock-barang-jadi/stock-barang-jadi-subnav";
import { pageStackWide } from "@/lib/page-layout";

export default function StockBarangJadiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell searchPlaceholder="Cari stok barang jadi…">
      <div className={pageStackWide}>
        <StockBarangJadiSubnav />
        {children}
      </div>
    </AppShell>
  );
}
