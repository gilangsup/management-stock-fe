"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { formatDate } from "@/lib/format";
import type { DailyOrderDetail, DailyOrderListItem } from "@/components/inventory/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VendorAggregate = {
  finishedProductId: string;
  productName: string;
  itemCode: string;
  unit: string;
  totalQty: number;
};

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

export function DaftarVendorTab({ viewDate, onViewDateChange }: Props) {
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

  // Aggregate vendor items by product
  const vendorLines = useMemo<VendorAggregate[]>(() => {
    if (!orderDetailQuery.data) return [];
    const map = new Map<string, VendorAggregate>();
    for (const order of orderDetailQuery.data) {
      for (const l of order.lines.filter((l) => l.source === "vendor")) {
        const existing = map.get(l.finishedProductId);
        if (existing) {
          existing.totalQty += Number(l.qty);
        } else {
          map.set(l.finishedProductId, {
            finishedProductId: l.finishedProductId,
            productName: l.productName,
            itemCode: l.itemCode ?? "",
            unit: l.unit.code,
            totalQty: Number(l.qty),
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName),
    );
  }, [orderDetailQuery.data]);

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
          Rekap item <strong>vendor</strong> dari semua pesanan confirmed pada tanggal PO tersebut —
          dikelompokkan per produk.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
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
                    {l.totalQty.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{l.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
