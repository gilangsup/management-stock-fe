"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FakturPenjualanPrintLayout } from "@/components/faktur/faktur-penjualan-print-layout";
import { api } from "@/lib/api";
import type { SalesInvoiceDetail } from "@/types/sales";

export default function FakturPenjualanPrintPage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sales-transaction-detail", id],
    queryFn: async () => {
      const { data: res } = await api.get<{ data: SalesInvoiceDetail }>(
        `/sales-transactions/${id}`,
      );
      return res.data;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memuat faktur penjualan…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Faktur penjualan tidak dapat dimuat.
      </div>
    );
  }

  return (
    <>
      <FakturPenjualanPrintLayout data={data} />
      <p className="faktur-print-toolbar fixed bottom-4 left-1/2 z-50 -translate-x-1/2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Cetak / Simpan PDF
        </Button>
      </p>
    </>
  );
}
