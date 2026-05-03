"use client";

import { PageHeader } from "@/components/layout/page-header";
import { FinishedProductMovementsTab } from "@/components/inventory/finished-product-movements-tab";

export default function RiwayatStokPage() {
  return (
    <>
      <PageHeader
        title="Riwayat stok barang jadi"
        description="Catatan setiap kejadian masuk / keluar stok. Kolom Stok SKU menampilkan saldo kumulatif setelah tiap kejadian."
      />
      <FinishedProductMovementsTab />
    </>
  );
}
