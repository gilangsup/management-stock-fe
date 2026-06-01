"use client";

import { BarChart3, Package, Receipt, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpensesByItemTab } from "@/components/reports/expenses-by-item-tab";
import { SalesByProductTab } from "@/components/reports/sales-by-product-tab";
import { SalesInvoicesReportTab } from "@/components/reports/sales-invoices-report-tab";

export default function ReportsPage() {
  return (
    <AppShell searchPlaceholder="Cari laporan…">
      <div className={pageStackWide}>
        <PageHeader
          title="Laporan"
          description="Agregat belanja harian, penjualan per produk, dan faktur penjualan per hotel atau periode. Export Excel dan PDF tersedia di setiap tab."
        />

        <Tabs defaultValue="belanja">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="belanja" className="flex-1 sm:flex-none">
              <ShoppingCart className="mr-1.5 size-3.5" />
              Belanja per item
            </TabsTrigger>
            <TabsTrigger value="penjualan" className="flex-1 sm:flex-none">
              <Package className="mr-1.5 size-3.5" />
              Penjualan per produk
            </TabsTrigger>
            <TabsTrigger value="faktur" className="flex-1 sm:flex-none">
              <Receipt className="mr-1.5 size-3.5" />
              Faktur penjualan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="belanja" className="mt-4">
            <ExpensesByItemTab />
          </TabsContent>

          <TabsContent value="penjualan" className="mt-4">
            <SalesByProductTab />
          </TabsContent>

          <TabsContent value="faktur" className="mt-4">
            <SalesInvoicesReportTab />
          </TabsContent>
        </Tabs>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="size-3.5" />
          PDF menggunakan dialog cetak browser — pilih &quot;Save as PDF&quot; saat mencetak.
        </p>
      </div>
    </AppShell>
  );
}
