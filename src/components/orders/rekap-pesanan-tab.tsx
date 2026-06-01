"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { DailyOrderListItem } from "@/components/inventory/types";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { DeleteTarget } from "@/components/orders/order-delete-dialog";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTER_ALL = "__all__";
const PAGE_SIZE = 20;

type Hotel = { id: string; name: string };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  isAdmin: boolean;
  editLoadingId: string | null;
  onDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (target: DeleteTarget) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RekapPesananTab({ isAdmin, editLoadingId, onDetail, onEdit, onDelete }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [hotelFilter, setHotelFilter] = useState(FILTER_ALL);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [page, setPage] = useState(1);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ["daily-orders", "list", page, hotelFilter, dateFrom, dateTo, statusFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (hotelFilter !== FILTER_ALL) params.hotelId = hotelFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (statusFilter !== FILTER_ALL) params.status = statusFilter;
      const { data } = await api.get<{
        data: DailyOrderListItem[];
        meta?: { total: number };
      }>("/daily-orders", { params });
      return data;
    },
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta?.total;
  const hasNext = rows.length === PAGE_SIZE;
  const hasPrev = page > 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Hotel</p>
          <Select
            value={hotelFilter}
            onValueChange={(v) => { setHotelFilter(v ?? FILTER_ALL); setPage(1); }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua hotel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Semua hotel</SelectItem>
              {(hotels.data ?? []).map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tanggal PO dari</p>
          <DateField value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tanggal PO sampai</p>
          <DateField value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Status</p>
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v ?? FILTER_ALL); setPage(1); }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Semua status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal PO</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>No. PO</TableHead>
              <TableHead>Tgl Kirim</TableHead>
              <TableHead className="text-center">Item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : listQuery.isError ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-destructive text-sm">
                  Gagal memuat data pesanan.
                </TableCell>
              </TableRow>
            ) : !rows.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                  Belum ada pesanan pada rentang ini.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{formatDate(order.orderDate)}</TableCell>
                  <TableCell>{order.hotel.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {order.poNumber ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {order.deliveryDate ? (
                      formatDate(order.deliveryDate)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{order.lineCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                        onClick={() => onDetail(order.id)}
                      >
                        <Eye className="mr-1 size-3.5" />
                        Detail
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="size-8 border-border text-muted-foreground hover:text-foreground"
                        disabled={editLoadingId === order.id}
                        onClick={() => onEdit(order.id)}
                        title="Edit pesanan"
                      >
                        {editLoadingId === order.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                      </Button>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="size-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete({ id: order.id, poNumber: order.poNumber })}
                          title="Hapus pesanan"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!listQuery.isLoading && rows.length > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page}
            {typeof total === "number" ? ` — ${total} pesanan` : ""}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Sebelumnya
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
