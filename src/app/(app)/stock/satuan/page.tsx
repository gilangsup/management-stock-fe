"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MasterUnitsTab } from "@/components/inventory/master-units-tab";
import { getStoredUser } from "@/lib/auth-storage";

export default function SatuanPage() {
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

  return (
    <>
      <PageHeader
        title="Satuan"
        description="Master satuan dipakai di bahan baku dan pencatatan stok. Kode unik (mis. kg, pcs)."
      />
      <MasterUnitsTab isAdmin={!!isAdmin} />
    </>
  );
}
