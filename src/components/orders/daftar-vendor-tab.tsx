"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { DateField } from "@/components/forms/date-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { escapeHtml, printHtmlDocument } from "@/lib/export-utils";
import { formatDate } from "@/lib/format";
import { OrderExportActions } from "@/components/orders/order-export-actions";

type VendorSummaryLine = {
  finishedProductId: string;
  productName: string;
  itemCode: string;
  unitCode: string;
  totalQty: string;
};

type Props = {
  viewDate: string;
  onViewDateChange: (date: string) => void;
};

export function DaftarVendorTab({ viewDate, onViewDateChange }: Props) {
  const summaryQuery = useQuery({
    queryKey: ["daily-orders", "vendor-summary", viewDate],
    queryFn: async () => {
      const { data } = await api.get<{ data: VendorSummaryLine[] }>(
        "/daily-orders/summary/vendor",
        { params: { date: viewDate } },
      );
      return data.data;
    },
  });

  const vendorLines = summaryQuery.data ?? [];

  const printPdf = useCallback(() => {
    const rows = vendorLines
      .map(
        (l, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(l.productName)}</td>
            <td>${escapeHtml(l.itemCode)}</td>
            <td class="text-right">${Number(l.totalQty).toLocaleString("id-ID")}</td>
            <td>${escapeHtml(l.unitCode)}</td>
          </tr>`,
      )
      .join("");

    printHtmlDocument(
      `Beli Vendor ${viewDate}`,
      `<h1>Daftar Beli Vendor</h1>
       <p class="meta">Tanggal PO: ${escapeHtml(formatDate(viewDate))} · ${vendorLines.length} produk</p>
       <table>
         <thead><tr><th>#</th><th>Produk</th><th>Kode</th><th class="text-right">Total Qty</th><th>Satuan</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`,
    );
  }, [vendorLines, viewDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Tanggal PO</p>
            <DateField value={viewDate} onChange={onViewDateChange} />
          </div>
          <p className="pb-1 text-xs text-muted-foreground max-w-md">
            Rekap item <strong>vendor</strong> dari semua pesanan confirmed pada tanggal PO tersebut —
            dikelompokkan per produk.
          </p>
        </div>
        <OrderExportActions
          date={viewDate}
          kind="vendor"
          disabled={!vendorLines.length || summaryQuery.isLoading}
          onPrintPdf={printPdf}
        />
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </div>
      ) : vendorLines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <ShoppingBag className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Tidak ada item vendor untuk <strong>{formatDate(viewDate)}</strong>.
          </p>
        </div>
      ) : (
        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead>Satuan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorLines.map((l, i) => (
                <TableRow key={l.finishedProductId}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{l.productName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {l.itemCode}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-base">
                    {Number(l.totalQty).toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.unitCode}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
