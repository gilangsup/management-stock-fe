"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { KwitansiPrintLayout } from "@/components/kwitansi/kwitansi-print-layout";
import { api } from "@/lib/api";

export default function ReceiptPrintPage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-receipt", id],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: {
          receiptNumber: string;
          hotelName: string;
          totalAmount: string;
        };
      }>(`/invoice-exchanges/${id}`);
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

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memuat kwitansi…
      </div>
    );
  }

  return (
    <>
      <KwitansiPrintLayout
        data={{
          receiptNumber: data.receiptNumber,
          receivedFrom: data.hotelName,
          totalAmount: data.totalAmount,
        }}
      />
      <p className="kwitansi-print-toolbar fixed bottom-4 left-1/2 z-50 -translate-x-1/2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Cetak / Simpan PDF
        </Button>
      </p>
    </>
  );
}
