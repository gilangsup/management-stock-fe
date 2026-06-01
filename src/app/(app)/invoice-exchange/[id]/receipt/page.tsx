"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KwitansiPrintLayout } from "@/components/kwitansi/kwitansi-print-layout";
import { api } from "@/lib/api";

type ReceiptData = {
  receiptNumber: string;
  hotelName: string;
  hotelPtName: string | null;
  totalAmount: string;
};

export default function ReceiptPrintPage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const [untukPembayaran, setUntukPembayaran] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-receipt", id],
    queryFn: async () => {
      const { data: res } = await api.get<{
        success: boolean;
        data: ReceiptData;
      }>(`/invoice-exchanges/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 600);
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

  const receivedFrom = data.hotelPtName?.trim() || data.hotelName;

  return (
    <>
      <KwitansiPrintLayout
        data={{
          receiptNumber: data.receiptNumber,
          receivedFrom,
          totalAmount: data.totalAmount,
          untukPembayaran: untukPembayaran.trim() || undefined,
        }}
      />

      {/* Toolbar — hanya tampil di layar, tersembunyi saat print */}
      <div className="kwitansi-print-toolbar fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center gap-2 bg-white/95 backdrop-blur-sm border-t shadow-lg px-4 py-3 print:hidden sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:rounded-xl sm:border sm:bg-white sm:px-5 sm:py-4">
        <div className="w-full max-w-sm space-y-1.5 sm:w-80">
          <Label className="text-sm font-medium">Untuk pembayaran:</Label>
          <textarea
            value={untukPembayaran}
            onChange={(e) => setUntukPembayaran(e.target.value)}
            placeholder="Isi keterangan pembayaran…&#10;(bisa lebih dari 1 baris)"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">
            Enter untuk baris baru — semua baris tercetak.
          </p>
        </div>
        <Button type="button" onClick={() => window.print()} className="btn-gradient w-full max-w-sm border-0 sm:w-80">
          Cetak / Simpan PDF
        </Button>
      </div>
    </>
  );
}
