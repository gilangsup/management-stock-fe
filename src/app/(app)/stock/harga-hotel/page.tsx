"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { HotelSellPricesTab } from "@/components/inventory/hotel-sell-prices-tab";
import { getStoredUser } from "@/lib/auth-storage";

export default function HargaHotelPage() {
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

  return (
    <>
      <PageHeader
        title="Harga hotel"
        description="Master hotel (tambah daftar hotel) dan harga jual per barang jadi per hotel untuk bon/faktur."
      />
      <HotelSellPricesTab isAdmin={!!isAdmin} />
    </>
  );
}
