"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { formatDate } from "@/lib/format";
import type { DailyOrderDetail, DailyOrderLine, DailyOrderListItem, DeliverySlot } from "@/components/inventory/types";
import { SLOT_LABELS } from "@/components/orders/daily-order-form-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type KitchenLine = DailyOrderLine & { hotelName: string };

function groupBySlot(lines: KitchenLine[]): Map<DeliverySlot, KitchenLine[]> {
  const slots: DeliverySlot[] = ["CB1", "CB2", "CB3", "unspecified"];
  const m = new Map<DeliverySlot, KitchenLine[]>(slots.map((s) => [s, []]));
  for (const l of lines) {
    m.get(l.deliverySlot)!.push(l);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  viewDate: string;
  onViewDateChange: (date: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstruksiDapurTab({ viewDate, onViewDateChange }: Props) {
  const orderListQuery = useQuery({
    queryKey: ["daily-orders", "view", viewDate],
    queryFn: async () => {
      const { data } = await api.get<{ data: DailyOrderListItem[] }>("/daily-orders", {
        params: { from: viewDate, to: viewDate, status: "confirmed", limit: 100 },
      });
      return data.data;
    },
  });

  const orderDetailQuery = useQuery({
    queryKey: ["daily-orders", "view-detail", viewDate],
    queryFn: async () => {
      const list = orderListQuery.data ?? [];
      const details = await Promise.all(
        list.map(async (o) => {
          const { data } = await api.get<{ data: DailyOrderDetail }>(`/daily-orders/${o.id}`);
          return data.data;
        }),
      );
      return details;
    },
    enabled: Boolean(orderListQuery.data?.length),
  });

  const kitchenLines = useMemo<KitchenLine[]>(() => {
    if (!orderDetailQuery.data) return [];
    return orderDetailQuery.data.flatMap((o) =>
      o.lines
        .filter((l) => l.source === "internal")
        .map((l) => ({ ...l, hotelName: o.hotel.name })),
    );
  }, [orderDetailQuery.data]);

  const bySlot = useMemo(() => groupBySlot(kitchenLines), [kitchenLines]);

  const isLoading = orderListQuery.isLoading || orderDetailQuery.isLoading;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Tanggal PO</p>
          <DateField value={viewDate} onChange={onViewDateChange} />
        </div>
        <p className="pb-1 text-xs text-muted-foreground">
          Menampilkan semua pesanan <strong>confirmed</strong> pada tanggal PO tersebut —
          item yang dibuat sendiri, dikelompokkan per jam pengiriman.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
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
                            {Number(l.qty).toLocaleString("id-ID")} {l.unit.code}
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
