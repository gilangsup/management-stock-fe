"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDate, formatIdr } from "@/lib/format";
import type { SalesInvoiceDetail } from "@/types/sales";

export default function BonPenjualanPage() {
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
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memuat Bon…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Bon tidak dapat dimuat (faktur tidak ada atau API error).
      </div>
    );
  }

  const d = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/80 to-background p-8 text-foreground print:bg-white print:p-6">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="-mx-8 -mt-8 mb-6 h-1 bg-primary/35 print:hidden" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">BON PENJUALAN</h1>
          <p className="text-sm text-muted-foreground">Executive Architect</p>
        </div>
        <div className="mt-6 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">No. faktur:</span>{" "}
            <span className="font-mono font-medium">{d.transactionCode}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Tanggal:</span> {formatDate(d.saleDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Hotel:</span> {d.hotelName}
            {d.hotelCode ? (
              <span className="text-muted-foreground"> ({d.hotelCode})</span>
            ) : null}
          </p>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2">Barang</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {(d.lines ?? []).map((l, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="py-2">
                  <span className="font-mono text-xs text-muted-foreground">{l.itemCode}</span>
                  <br />
                  {l.name}
                  <span className="block text-xs text-muted-foreground">
                    {l.unit.name} @ {formatIdr(l.sellPrice)}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{l.qty}</td>
                <td className="py-2 text-right tabular-nums">{formatIdr(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-semibold">
          <span>Grand total</span>
          <span className="tabular-nums">{formatIdr(d.grandTotal)}</span>
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground print:hidden">
          <Button type="button" onClick={() => window.print()}>
            Cetak
          </Button>
        </p>
      </div>
    </div>
  );
}
