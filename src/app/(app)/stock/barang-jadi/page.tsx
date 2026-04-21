"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FinishedProductsTab } from "@/components/inventory/finished-products-tab";
import { useInventoryMasters } from "@/components/inventory/use-inventory-masters";
import { getStoredUser } from "@/lib/auth-storage";

export default function BarangJadiPage() {
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);
  const { categories } = useInventoryMasters();

  return (
    <>
      <PageHeader
        title="Barang jadi"
        description="Harga pokok global per SKU; kategori menentukan prefix kode otomatis. Stok di kolom Stok diubah lewat menu Stock barang masuk / keluar."
      />
      <FinishedProductsTab
        isAdmin={!!isAdmin}
        categories={categories.data?.data}
        categoriesLoading={categories.isLoading}
      />
    </>
  );
}
