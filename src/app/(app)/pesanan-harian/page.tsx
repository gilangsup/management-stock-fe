"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { pageStackWide } from "@/lib/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredUser } from "@/lib/auth-storage";
import { formatDate, formatIdr } from "@/lib/format";
import type {
  DailyOrderDetail,
  DailyOrderLine,
  DailyOrderListItem,
  DeliverySlot,
} from "@/components/inventory/types";
import {
  DailyOrderFormDialog,
  DeliverySlotBadge,
  SLOT_LABELS,
  SourceBadge,
} from "@/components/orders/daily-order-form-dialog";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type Hotel = { id: string; name: string };
const FILTER_ALL = "__all__";
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: "draft" | "confirmed" }) {
  return status === "confirmed" ? (
    <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">
      Confirmed
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Draft
    </Badge>
  );
}

// Group lines by delivery slot for kitchen view
function groupBySlot(lines: DailyOrderLine[]): Map<DeliverySlot, DailyOrderLine[]> {
  const m = new Map<DeliverySlot, DailyOrderLine[]>();
  const order: DeliverySlot[] = ["CB1", "CB2", "CB3", "unspecified"];
  for (const slot of order) m.set(slot, []);
  for (const l of lines) {
    const arr = m.get(l.deliverySlot) ?? [];
    arr.push(l);
    m.set(l.deliverySlot, arr);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Order detail modal
// ---------------------------------------------------------------------------

function OrderDetailModal({
  orderId,
  open,
  onClose,
  onEdit,
  onDeleted,
  onInvoiced,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (order: DailyOrderDetail) => void;
  onDeleted: () => void;
  onInvoiced: (invoiceId: string) => void;
}) {
  const qc = useQueryClient();
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detail = useQuery({
    queryKey: ["daily-orders", orderId],
    queryFn: async () => {
      const { data } = await api.get<{ data: DailyOrderDetail }>(`/daily-orders/${orderId}`);
      return data.data;
    },
    enabled: open && Boolean(orderId),
  });

  const deleteOrder = useMutation({
    mutationFn: async () => api.delete(`/daily-orders/${orderId}`),
    onSuccess: () => {
      toast.success("Pesanan dihapus");
      qc.invalidateQueries({ queryKey: ["daily-orders"] });
      setConfirmDelete(false);
      onClose();
      onDeleted();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus")),
  });

  const toInvoice = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { invoiceId: string; transactionCode: string } }>(
        `/daily-orders/${orderId}/to-invoice`,
        {},
      );
      return data.data;
    },
    onSuccess: (res) => {
      toast.success(`Faktur ${res.transactionCode} berhasil dibuat`);
      qc.invalidateQueries({ queryKey: ["sales-transactions"] });
      onClose();
      onInvoiced(res.invoiceId);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal membuat faktur")),
  });

  const order = detail.data;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-1rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              {detail.isLoading ? "Memuat…" : `Pesanan — ${order?.hotel.name ?? ""}`}
            </DialogTitle>
          </DialogHeader>

          {detail.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : detail.isError ? (
            <p className="py-8 text-center text-sm text-destructive">Gagal memuat data.</p>
          ) : order ? (
            <div className="space-y-4">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Hotel</p>
                  <p className="font-medium">{order.hotel.name}</p>
                  <p className="text-xs text-muted-foreground">{order.hotel.code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal PO</p>
                  <p className="font-medium">{formatDate(order.orderDate)}</p>
                </div>
                {order.deliveryDate ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal kirim</p>
                    <p className="font-medium">{formatDate(order.deliveryDate)}</p>
                  </div>
                ) : null}
                {order.poNumber ? (
                  <div>
                    <p className="text-xs text-muted-foreground">No. PO</p>
                    <p className="font-mono text-sm">{order.poNumber}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={order.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total PO</p>
                  <p className="font-bold tabular-nums">{formatIdr(order.grandTotal)}</p>
                </div>
              </div>

              {/* Lines */}
              <div className="surface-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Jam kirim</TableHead>
                      <TableHead>Asal</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.map((l, i) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{l.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{l.itemCode}</p>
                        </TableCell>
                        <TableCell>
                          <DeliverySlotBadge slot={l.deliverySlot} />
                        </TableCell>
                        <TableCell>
                          <SourceBadge source={l.source} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(l.qty).toLocaleString("id-ID")} {l.unit.code}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatIdr(l.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatIdr(l.lineTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {order.notes ? (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {order.notes}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-wrap gap-2">
            {isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Hapus
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => order && onEdit(order)}
              disabled={!order}
            >
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              className="btn-gradient border-0"
              disabled={!order || toInvoice.isPending || order.status !== "confirmed"}
              onClick={() => toInvoice.mutate()}
              title={order?.status !== "confirmed" ? "Konfirmasi pesanan dulu sebelum buat faktur" : ""}
            >
              {toInvoice.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 size-3.5" />
              )}
              Buat faktur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus pesanan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pesanan dan semua item-nya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOrder.isPending}
              onClick={() => deleteOrder.mutate()}
            >
              {deleteOrder.isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PesananHarianPage() {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [hotelFilter, setHotelFilter] = useState(FILTER_ALL);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [page, setPage] = useState(1);

  // Kitchen / vendor view date
  const [viewDate, setViewDate] = useState(today);

  const qc = useQueryClient();
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<DailyOrderDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; poNumber: string | null } | null>(null);

  // ── Inline delete mutation ────────────────────────────────────────────────
  const deleteOrder = useMutation({
    mutationFn: async (id: string) => api.delete(`/daily-orders/${id}`),
    onSuccess: () => {
      toast.success("Pesanan dihapus");
      qc.invalidateQueries({ queryKey: ["daily-orders"] });
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus pesanan")),
  });

  // ── Load detail for inline edit ───────────────────────────────────────────
  async function openEditFromRow(id: string) {
    setEditLoadingId(id);
    try {
      const { data } = await api.get<{ data: DailyOrderDetail }>(`/daily-orders/${id}`);
      setEditData(data.data);
      setFormOpen(true);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal memuat pesanan"));
    } finally {
      setEditLoadingId(null);
    }
  }

  // ── Hotels query ─────────────────────────────────────────────────────────
  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
    staleTime: 60_000,
  });

  // ── Tab A: list orders ────────────────────────────────────────────────────
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

  // ── Tab B + C: kitchen/vendor view ────────────────────────────────────────
  const viewQuery = useQuery({
    queryKey: ["daily-orders", "view", viewDate],
    queryFn: async () => {
      const { data } = await api.get<{ data: DailyOrderListItem[] }>("/daily-orders", {
        params: { from: viewDate, to: viewDate, status: "confirmed", limit: 100 },
      });
      return data.data;
    },
  });

  // Load full detail for confirmed orders of that date
  const viewDetailQuery = useQuery({
    queryKey: ["daily-orders", "view-detail", viewDate],
    queryFn: async () => {
      const list = viewQuery.data ?? [];
      const details = await Promise.all(
        list.map(async (o) => {
          const { data } = await api.get<{ data: DailyOrderDetail }>(`/daily-orders/${o.id}`);
          return data.data;
        }),
      );
      return details;
    },
    enabled: Boolean(viewQuery.data?.length),
  });

  // Flatten all lines from confirmed orders for the view date
  const allLines = useMemo(
    () => viewDetailQuery.data?.flatMap((o) => o.lines.map((l) => ({ ...l, hotelName: o.hotel.name }))) ?? [],
    [viewDetailQuery.data],
  );

  const kitchenLines = useMemo(
    () => allLines.filter((l) => l.source === "internal"),
    [allLines],
  );

  const vendorLines = useMemo(() => {
    // Aggregate vendor lines by product
    const map = new Map<string, { productName: string; itemCode: string; unit: string; totalQty: number }>();
    for (const l of allLines.filter((l) => l.source === "vendor")) {
      const existing = map.get(l.finishedProductId);
      if (existing) {
        existing.totalQty += Number(l.qty);
      } else {
        map.set(l.finishedProductId, {
          productName: l.productName,
          itemCode: l.itemCode ?? "",
          unit: l.unit.code,
          totalQty: Number(l.qty),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [allLines]);

  const kitchenBySlot = useMemo(() => groupBySlot(kitchenLines), [kitchenLines]);

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta?.total;
  const hasNext = rows.length === PAGE_SIZE;
  const hasPrev = page > 1;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppShell searchPlaceholder="Pesanan harian…">
      <div className={pageStackWide}>
        <PageHeader
          title="Pesanan Harian"
          description="Kelola PO dari hotel, instruksi dapur, dan daftar pembelian vendor."
        >
          <Button
            type="button"
            className="btn-gradient w-full border-0 sm:w-auto"
            onClick={() => {
              setEditData(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Tambah pesanan
          </Button>
        </PageHeader>

        <Tabs defaultValue="rekap">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="rekap" className="flex-1 sm:flex-none">
              <ClipboardList className="mr-1.5 size-3.5" />
              Rekap pesanan
            </TabsTrigger>
            <TabsTrigger value="dapur" className="flex-1 sm:flex-none">
              <ChefHat className="mr-1.5 size-3.5" />
              Instruksi dapur
            </TabsTrigger>
            <TabsTrigger value="vendor" className="flex-1 sm:flex-none">
              <ShoppingBag className="mr-1.5 size-3.5" />
              Daftar beli vendor
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════════════
              TAB A: REKAP PESANAN
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="rekap" className="mt-4 space-y-4">
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
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Dari tanggal</p>
                <DateField value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Sampai tanggal</p>
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
                        <TableCell className="font-medium">
                          {formatDate(order.orderDate)}
                        </TableCell>
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
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                              onClick={() => setDetailId(order.id)}
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
                              onClick={() => openEditFromRow(order.id)}
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
                                onClick={() =>
                                  setDeleteTarget({ id: order.id, poNumber: order.poNumber })
                                }
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB B: INSTRUKSI DAPUR
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="dapur" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tanggal kirim</p>
                <DateField value={viewDate} onChange={setViewDate} />
              </div>
              <p className="text-xs text-muted-foreground pb-1">
                Menampilkan semua pesanan <strong>confirmed</strong> pada tanggal tersebut — item yang dibuat sendiri.
              </p>
            </div>

            {viewDetailQuery.isLoading || viewQuery.isLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat…
              </div>
            ) : kitchenLines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <ChefHat className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada instruksi dapur untuk{" "}
                  <strong>{formatDate(viewDate)}</strong>.
                  <br />
                  Pastikan ada pesanan confirmed pada tanggal ini.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(["CB1", "CB2", "CB3", "unspecified"] as DeliverySlot[]).map((slot) => {
                  const lines = kitchenBySlot.get(slot) ?? [];
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
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {l.itemCode}
                                  </p>
                                </TableCell>
                                <TableCell className="text-sm">{(l as typeof l & { hotelName: string }).hotelName}</TableCell>
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
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════════
              TAB C: DAFTAR BELI VENDOR
          ══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="vendor" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tanggal kirim</p>
                <DateField value={viewDate} onChange={setViewDate} />
              </div>
              <p className="text-xs text-muted-foreground pb-1">
                Rekap item <strong>vendor</strong> dari semua pesanan confirmed — dikelompokkan per produk.
              </p>
            </div>

            {viewDetailQuery.isLoading || viewQuery.isLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat…
              </div>
            ) : vendorLines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                <ShoppingBag className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada item vendor untuk{" "}
                  <strong>{formatDate(viewDate)}</strong>.
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
                      <TableRow key={l.itemCode}>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Form dialog (create / edit) ─────────────────────────────────────── */}
      <DailyOrderFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditData(null);
        }}
        editData={editData}
        onSuccess={() => { /* invalidation handled inside dialog */ }}
      />

      {/* ── Detail modal ────────────────────────────────────────────────────── */}
      <OrderDetailModal
        orderId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        onEdit={(order) => {
          setDetailId(null);
          setEditData(order);
          setFormOpen(true);
        }}
        onDeleted={() => setDetailId(null)}
        onInvoiced={(invoiceId) => router.push(`/penjualan/${invoiceId}`)}
      />

      {/* ── Konfirmasi hapus (inline dari tabel) ───────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus pesanan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget?.poNumber ? (
              <>
                Pesanan <strong className="text-foreground">{deleteTarget.poNumber}</strong> dan
                semua item-nya akan dihapus permanen.
              </>
            ) : (
              "Pesanan dan semua item-nya akan dihapus permanen."
            )}{" "}
            Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteOrder.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteOrder.isPending}
              onClick={() => deleteTarget && deleteOrder.mutate(deleteTarget.id)}
            >
              {deleteOrder.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menghapus…
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
