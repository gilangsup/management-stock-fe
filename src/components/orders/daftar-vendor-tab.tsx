"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
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
import {
  formatNotesDisplay,
  formatQtyDisplay,
  groupProductsFlat,
  type PerHotelSummaryRow,
} from "@/lib/order-summary-display";
import { OrderExportActions } from "@/components/orders/order-export-actions";

type VendorSummaryLine = {
  finishedProductId: string;
  productName: string;
  itemCode: string;
  unitCode: string;
  hotelCode: string;
  hotelName: string;
  qty: number;
  notes: string;
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

  const productGroups = useMemo(() => {
    const perHotel: PerHotelSummaryRow[] = vendorLines.map((l) => ({
      hotelCode: l.hotelCode,
      productName: l.productName,
      itemCode: l.itemCode,
      unitCode: l.unitCode,
      qty: l.qty,
      notes: l.notes?.trim() || "-",
    }));
    return groupProductsFlat(perHotel);
  }, [vendorLines]);

  const printPdf = useCallback(() => {
    const rows = productGroups
      .map(
        (p, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(p.productName)}</td>
            <td>${escapeHtml(p.itemCode)}</td>
            <td class="text-right">${escapeHtml(formatQtyDisplay(p))}</td>
            <td>${escapeHtml(p.unitCode)}</td>
            <td>${escapeHtml(formatNotesDisplay(p))}</td>
          </tr>`,
      )
      .join("");

    printHtmlDocument(
      `Beli Vendor ${viewDate}`,
      `<h1>Daftar Beli Vendor</h1>
       <p class="meta">Tanggal PO: ${escapeHtml(formatDate(viewDate))} · ${productGroups.length} produk</p>
       <table>
         <thead><tr><th>#</th><th>Produk</th><th>Kode</th><th class="text-right">Qty</th><th>Satuan</th><th>Catatan</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`,
    );
  }, [productGroups, viewDate]);

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
          disabled={!productGroups.length || summaryQuery.isLoading}
          onPrintPdf={printPdf}
        />
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </div>
      ) : productGroups.length === 0 ? (
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
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productGroups.map((p, i) => (
                <TableRow key={`${p.itemCode}-${p.unitCode}`}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{p.productName}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {p.itemCode}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-base">
                    {formatQtyDisplay(p)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.unitCode}</TableCell>
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                    {formatNotesDisplay(p)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
