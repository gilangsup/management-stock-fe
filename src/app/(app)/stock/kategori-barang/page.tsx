"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MasterCategoriesTab } from "@/components/inventory/master-categories-tab";
import { getStoredUser } from "@/lib/auth-storage";

export default function KategoriBarangPage() {
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

  return (
    <>
      <PageHeader
        title="Kategori barang"
        description="Prefix kode untuk barang jadi dan bahan baku (satu master kategori untuk keduanya)."
      />
      <MasterCategoriesTab isAdmin={!!isAdmin} />
    </>
  );
}
