"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatIdr } from "@/lib/format";

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
          hotelAddress: string | null;
          exchangeDate: string;
          notes: string | null;
          lines: { description: string; amount: string }[];
          totalAmount: string;
        };
      }>(`/invoice-exchanges/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 300);
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
    <div className="min-h-screen bg-gradient-to-b from-muted/80 to-background p-4 text-foreground sm:p-8 print:bg-white print:p-6">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8 print:rounded-none print:border-0 print:shadow-none print:p-6">
        <div className="-mx-4 -mt-4 mb-6 h-1 bg-primary/35 sm:-mx-8 sm:-mt-8 print:hidden" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground print:text-foreground">
            KWITANSI
          </h1>
          <p className="text-sm text-muted-foreground print:text-muted-foreground">
            Executive Architect — Penukaran Faktur
          </p>
        </div>
        <div className="mt-6 space-y-1 text-sm">
          <p>
            <span className="text-slate-500">Nomor:</span> {data.receiptNumber}
          </p>
          <p>
            <span className="text-slate-500">Hotel:</span> {data.hotelName}
          </p>
          {data.hotelAddress ? (
            <p>
              <span className="text-slate-500">Alamat:</span> {data.hotelAddress}
            </p>
          ) : null}
          <p>
            <span className="text-slate-500">Tanggal:</span> {formatDate(data.exchangeDate)}
          </p>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2">Keterangan</th>
              <th className="py-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right tabular-nums">{formatIdr(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-between border-t border-slate-300 pt-4 text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatIdr(data.totalAmount)}</span>
        </div>
        {data.notes ? (
          <p className="mt-6 text-xs text-slate-600">Catatan: {data.notes}</p>
        ) : null}
        <p className="mt-10 text-center text-xs text-slate-500 print:hidden">
          <Button type="button" onClick={() => window.print()}>
            Cetak
          </Button>
        </p>
      </div>
    </div>
  );
}
