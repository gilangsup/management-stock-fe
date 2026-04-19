"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RawMaterialsTab } from "@/components/inventory/raw-materials-tab";
import { useInventoryMasters } from "@/components/inventory/use-inventory-masters";
import { getStoredUser } from "@/lib/auth-storage";

export default function BahanBakuPage() {
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);
  const { units, categories } = useInventoryMasters();

  return (
    <>
      <PageHeader
        title="Bahan baku"
        description="Nama, satuan, dan kategori (prefix kode sama dengan barang jadi). Pembelian dicatat di Belanja harian."
      />
      <RawMaterialsTab
        isAdmin={!!isAdmin}
        units={units.data?.data}
        unitsLoading={units.isLoading}
        categories={categories.data?.data}
        categoriesLoading={categories.isLoading}
      />
    </>
  );
}
