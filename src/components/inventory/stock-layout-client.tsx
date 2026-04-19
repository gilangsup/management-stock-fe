"use client";

import { AppShell } from "@/components/layout/app-shell";
import { InventorySidebar } from "./inventory-sidebar";

export function StockLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AppShell searchPlaceholder="Cari inventori…">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-start">
        <InventorySidebar />
        <div className="min-w-0 flex-1 space-y-8">{children}</div>
      </div>
    </AppShell>
  );
}
