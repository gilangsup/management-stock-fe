"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="kwitansi-print-toolbar fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-3 print:hidden">
        <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-lg border">
          <Label className="whitespace-nowrap text-sm font-medium">Untuk pembayaran:</Label>
          <Input
            value={untukPembayaran}
            onChange={(e) => setUntukPembayaran(e.target.value)}
            placeholder="Isi keterangan pembayaran…"
            className="w-72 h-8 text-sm"
          />
        </div>
        <Button type="button" onClick={() => window.print()} className="btn-gradient border-0">
          Cetak / Simpan PDF
        </Button>
      </div>
    </>
  );
}
