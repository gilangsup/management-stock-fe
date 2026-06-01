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
  notes: string | null;
};

function groupBySlot(lines: KitchenSummaryLine[]): Map<DeliverySlot, KitchenSummaryLine[]> {
  const slots: DeliverySlot[] = ["CB1", "CB2", "CB3", "unspecified"];
  const m = new Map<DeliverySlot, KitchenSummaryLine[]>(slots.map((s) => [s, []]));
  for (const l of lines) {
    m.get(l.deliverySlot)!.push(l);
  }
  return m;
}

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
  const bySlot = useMemo(() => groupBySlot(kitchenLines), [kitchenLines]);

  const printPdf = useCallback(() => {
    const slots: DeliverySlot[] = ["CB1", "CB2", "CB3", "unspecified"];
    const sections = slots
      .map((slot) => {
        const lines = bySlot.get(slot) ?? [];
        if (!lines.length) return "";
        const rows = lines
          .map(
            (l, i) =>
              `<tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(l.productName)}<br><small>${escapeHtml(l.itemCode)}</small></td>
                <td>${escapeHtml(l.hotelName)}</td>
                <td class="text-right">${Number(l.qty).toLocaleString("id-ID")} ${escapeHtml(l.unitCode)}</td>
                <td>${escapeHtml(l.notes ?? "—")}</td>
              </tr>`,
          )
          .join("");
        return `<div class="section">
          <h2>${escapeHtml(SLOT_LABELS[slot])}</h2>
          <table>
            <thead><tr><th>#</th><th>Produk</th><th>Hotel</th><th class="text-right">Qty</th><th>Catatan</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      })
      .join("");

    printHtmlDocument(
      `Instruksi Dapur ${viewDate}`,
      `<h1>Instruksi Dapur</h1>
       <p class="meta">Tanggal PO: ${escapeHtml(formatDate(viewDate))} · ${kitchenLines.length} item</p>
       ${sections}`,
    );
  }, [bySlot, kitchenLines.length, viewDate]);

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
          disabled={!kitchenLines.length || summaryQuery.isLoading}
          onPrintPdf={printPdf}
        />
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </div>
      ) : kitchenLines.length === 0 ? (
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
          {(["CB1", "CB2", "CB3", "unspecified"] as DeliverySlot[]).map((slot) => {
            const lines = bySlot.get(slot) ?? [];
            if (!lines.length) return null;
            return (
              <div key={slot} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  <h3 className="font-semibold">{SLOT_LABELS[slot]}</h3>
                  <Badge variant="secondary">{lines.length} item</Badge>
                </div>
                <div className="surface-table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead>Hotel</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <p className="font-medium">{l.productName}</p>
                            <p className="font-mono text-xs text-muted-foreground">{l.itemCode}</p>
                          </TableCell>
                          <TableCell className="text-sm">{l.hotelName}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {Number(l.qty).toLocaleString("id-ID")} {l.unitCode}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {l.notes ?? "—"}
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
