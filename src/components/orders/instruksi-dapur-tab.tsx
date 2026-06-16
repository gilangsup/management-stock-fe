"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { CalendarDays, ChefHat, Loader2 } from "lucide-react";
import { DateField } from "@/components/forms/date-field";
import { Badge } from "@/components/ui/badge";
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
  aggregateRawLinesToPerHotelRows,
  formatNotesDisplay,
  formatQtyDisplay,
  groupProductsBySlot,
  ORDER_SLOT_ORDER,
} from "@/lib/order-summary-display";
import type { DeliverySlot } from "@/components/inventory/types";
import { OrderExportActions } from "@/components/orders/order-export-actions";
import { SLOT_LABELS } from "@/components/orders/daily-order-form-dialog";

type KitchenSummaryLine = {
  id: string;
  deliverySlot: DeliverySlot;
  deliverySlotLabel: string;
  productName: string;
  itemCode: string;
  unitCode: string;
  qty: string;
  hotelName: string;
  hotelCode: string;
  notes: string | null;
};

type Props = {
  viewDate: string;
  onViewDateChange: (date: string) => void;
};

export function InstruksiDapurTab({ viewDate, onViewDateChange }: Props) {
  const summaryQuery = useQuery({
    queryKey: ["daily-orders", "kitchen-summary", viewDate],
    queryFn: async () => {
      const { data } = await api.get<{ data: KitchenSummaryLine[] }>(
        "/daily-orders/summary/kitchen",
        { params: { date: viewDate } },
      );
      return data.data;
    },
  });

  const kitchenLines = summaryQuery.data ?? [];

  const bySlot = useMemo(() => {
    const perHotel = aggregateRawLinesToPerHotelRows(
      kitchenLines.map((l) => ({
        deliverySlot: l.deliverySlot,
        itemCode: l.itemCode,
        unitCode: l.unitCode,
        productName: l.productName,
        hotelCode: l.hotelCode,
        qty: l.qty,
        notes: l.notes,
      })),
    );
    return groupProductsBySlot(perHotel);
  }, [kitchenLines]);

  const productCount = useMemo(
    () => Array.from(bySlot.values()).reduce((sum, groups) => sum + groups.length, 0),
    [bySlot],
  );

  const printPdf = useCallback(() => {
    const sections = ORDER_SLOT_ORDER.map((slot) => {
      const products = bySlot.get(slot) ?? [];
      if (!products.length) return "";
      const rows = products
        .map(
          (p, i) =>
            `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(p.productName)} - ${escapeHtml(p.itemCode)}</td>
              <td class="text-right">${escapeHtml(formatQtyDisplay(p))}</td>
              <td>${escapeHtml(formatNotesDisplay(p))}</td>
            </tr>`,
        )
        .join("");
      return `<div class="section">
        <h2>${escapeHtml(SLOT_LABELS[slot])}</h2>
        <table>
          <thead><tr><th>#</th><th>Produk</th><th class="text-right">Qty</th><th>Catatan</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join("");

    printHtmlDocument(
      `Instruksi Dapur ${viewDate}`,
      `<h1>Instruksi Dapur</h1>
       <p class="meta">Tanggal PO: ${escapeHtml(formatDate(viewDate))} · ${productCount} produk</p>
       ${sections}`,
    );
  }, [bySlot, productCount, viewDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Tanggal PO</p>
            <DateField value={viewDate} onChange={onViewDateChange} />
          </div>
          <p className="pb-1 text-xs text-muted-foreground max-w-md">
            Menampilkan semua pesanan <strong>confirmed</strong> pada tanggal PO tersebut —
            item yang dibuat sendiri, dikelompokkan per jam pengiriman.
          </p>
        </div>
        <OrderExportActions
          date={viewDate}
          kind="kitchen"
          disabled={!productCount || summaryQuery.isLoading}
          onPrintPdf={printPdf}
        />
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </div>
      ) : productCount === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <ChefHat className="mx-auto mb-3 size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Tidak ada instruksi dapur untuk <strong>{formatDate(viewDate)}</strong>.
            <br />
            Pastikan ada pesanan confirmed pada tanggal PO ini.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {ORDER_SLOT_ORDER.map((slot) => {
            const products = bySlot.get(slot) ?? [];
            if (!products.length) return null;
            return (
              <div key={slot} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  <h3 className="font-semibold">{SLOT_LABELS[slot]}</h3>
                  <Badge variant="secondary">{products.length} produk</Badge>
                </div>
                <div className="surface-table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p, i) => (
                        <TableRow key={`${slot}-${p.itemCode}-${p.unitCode}`}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium">{p.productName}</p>
                            <p className="font-mono text-xs text-muted-foreground">{p.itemCode}</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatQtyDisplay(p)}
                          </TableCell>
                          <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                            {formatNotesDisplay(p)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
