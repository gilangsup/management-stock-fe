"use client";

import { AppShell } from "@/components/layout/app-shell";
import { pageMaxWide } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import { InventorySidebar } from "./inventory-sidebar";

export function StockLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AppShell searchPlaceholder="Cari inventori…">
      <div
        className={cn(
          pageMaxWide,
          "flex flex-col gap-6 md:flex-row md:items-start md:gap-8",
        )}
      >
        <InventorySidebar />
        <div className="min-w-0 flex-1 space-y-6 sm:space-y-8">{children}</div>
      </div>
    </AppShell>
  );
}
