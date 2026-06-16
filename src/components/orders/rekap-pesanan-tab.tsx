"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { escapeHtml, printHtmlDocument } from "@/lib/export-utils";
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

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
};

function formatOrderNotes(order: DailyOrderListItem): string {
  const parts: string[] = [];
  if (order.lineNotesSummary?.trim()) parts.push(order.lineNotesSummary.trim());
  if (order.notes?.trim()) parts.push(order.notes.trim());
  return parts.length > 0 ? parts.join(" · ") : "—";
}

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

  // ── PDF export ────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);

  type RekapSummaryLine = {
    hotelId: string;
    hotelName: string;
    hotelCode: string;
    deliverySlot: string;
    productName: string;
    itemCode: string;
    unitCode: string;
    totalQty: number;
    notes: string;
  };

  /** Label pendek untuk header slot di PDF (sesuai gambar: "CB 1", "CB 2", …) */
  const SLOT_SHORT: Record<string, string> = {
    CB1: "CB 1",
    CB2: "CB 2",
    CB3: "CB 3",
    unspecified: "Lainnya",
  };
  const SLOT_ORDER = ["CB1", "CB2", "CB3", "unspecified"];

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const params: Record<string, string> = {};
      if (hotelFilter !== FILTER_ALL) params.hotelId = hotelFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (statusFilter !== FILTER_ALL) params.status = statusFilter;

      const { data } = await api.get<{ success: boolean; data: RekapSummaryLine[] }>(
        "/daily-orders/summary/rekap",
        { params },
      );
      const lines = data.data ?? [];

      if (lines.length === 0) {
        toast.info("Tidak ada data untuk filter ini.");
        return;
      }

      // Kelompokkan per CB → produk → qty & catatan per hotel (dipisah "/")
      type HotelEntry = { hotelCode: string; qty: number; notes: string };
      type ProductGroup = {
        productName: string;
        unitCode: string;
        byHotel: HotelEntry[];
      };

      const slotMap = new Map<string, Map<string, ProductGroup>>();
      for (const line of lines) {
        if (!slotMap.has(line.deliverySlot)) {
          slotMap.set(line.deliverySlot, new Map());
        }
        const products = slotMap.get(line.deliverySlot)!;
        const productKey = `${line.itemCode}\0${line.unitCode}`;
        if (!products.has(productKey)) {
          products.set(productKey, {
            productName: line.productName,
            unitCode: line.unitCode,
            byHotel: [],
          });
        }
        products.get(productKey)!.byHotel.push({
          hotelCode: line.hotelCode,
          qty: line.totalQty,
          notes: line.notes?.trim() || "-",
        });
      }

      const formatQtyPart = (qty: number) =>
        Number.isInteger(qty)
          ? qty.toLocaleString("id-ID")
          : qty.toLocaleString("id-ID", { maximumFractionDigits: 4 });

      const sortedHotelEntries = (entries: HotelEntry[]) =>
        [...entries].sort((a, b) => a.hotelCode.localeCompare(b.hotelCode));

      const formatQtyCell = (group: ProductGroup) => {
        const parts = sortedHotelEntries(group.byHotel).map((h) => formatQtyPart(h.qty));
        const joined = parts.join("/");
        return group.unitCode ? `${joined} ${group.unitCode}` : joined;
      };

      const formatNotesCell = (group: ProductGroup) => {
        const parts = sortedHotelEntries(group.byHotel).map((h) => h.notes || "-");
        if (parts.every((p) => p === "-")) return "-";
        return parts.join(" / ");
      };

      // Info filter untuk header PDF
      const filterMeta = [
        dateFrom
          ? `Tanggal PO: ${escapeHtml(formatDate(dateFrom))}${dateTo && dateTo !== dateFrom ? ` s.d. ${escapeHtml(formatDate(dateTo))}` : ""}`
          : "",
        hotelFilter !== FILTER_ALL
          ? escapeHtml(hotels.data?.find((h) => h.id === hotelFilter)?.name ?? hotelFilter)
          : "Semua hotel",
        statusFilter !== FILTER_ALL
          ? escapeHtml(STATUS_LABEL[statusFilter] ?? statusFilter)
          : "Semua status",
      ]
        .filter(Boolean)
        .join(" · ");

      // Bangun blok HTML per CB (semua hotel digabung)
      const cbBlocks = SLOT_ORDER.filter((slot) => slotMap.has(slot))
        .map((slot) => {
          const products = Array.from(slotMap.get(slot)!.values()).sort((a, b) =>
            a.productName.localeCompare(b.productName, "id"),
          );

          const tableRows = products
            .map(
              (p, i) =>
                `<tr>
                  <td class="col-no text-right">${i + 1}</td>
                  <td>${escapeHtml(p.productName)}</td>
                  <td class="col-qty text-right">${escapeHtml(formatQtyCell(p))}</td>
                  <td class="col-notes">${escapeHtml(formatNotesCell(p))}</td>
                </tr>`,
            )
            .join("");

          return `<div class="cb-block">
            <p class="cb-header">${escapeHtml(SLOT_SHORT[slot] ?? slot)}</p>
            <table>
              <thead>
                <tr>
                  <th class="col-no text-right">NO</th>
                  <th>PRODUK</th>
                  <th class="col-qty text-right">QTY</th>
                  <th class="col-notes">CATATAN</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>`;
        })
        .join("");

      const extraCss = `
        .cb-block { margin-bottom: 28px; page-break-inside: avoid; }
        .cb-header {
          font-size: 15px; font-weight: 800; text-transform: uppercase;
          margin: 0 0 10px; padding-bottom: 6px;
          border-bottom: 2.5px solid #111; letter-spacing: 0.03em;
          color: #bb0000;
        }
        .col-no { width: 36px; }
        .col-qty {
          width: 100px;
          max-width: 140px;
          word-break: break-word;
          overflow-wrap: anywhere;
          font-size: 11px;
          line-height: 1.35;
        }
        .col-notes {
          width: 140px;
          max-width: 200px;
          word-break: break-word;
          overflow-wrap: anywhere;
          font-size: 11px;
          line-height: 1.35;
        }
        table { margin-top: 0; }
        th { text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; }
      `;

      const body = `
        <style>${extraCss}</style>
        <h1>Rekap Pesanan Harian</h1>
        <p class="meta">${filterMeta}</p>
        ${cbBlocks}
      `;

      printHtmlDocument("Rekap Pesanan Harian", body);
    } catch {
      toast.error("Gagal mengunduh PDF rekap pesanan");
    } finally {
      setPdfLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelFilter, dateFrom, dateTo, statusFilter, hotels.data]);

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

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pdfLoading}
          onClick={handleDownloadPdf}
        >
          {pdfLoading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileDown className="mr-1.5 size-3.5" />
          )}
          Unduh PDF
        </Button>
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
              <TableHead className="min-w-[140px]">Catatan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : listQuery.isError ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-destructive text-sm">
                  Gagal memuat data pesanan.
                </TableCell>
              </TableRow>
            ) : !rows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
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
                  <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                    <span className="line-clamp-2" title={formatOrderNotes(order)}>
                      {formatOrderNotes(order)}
                    </span>
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
