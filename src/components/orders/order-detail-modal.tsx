"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredUser } from "@/lib/auth-storage";
import { formatDate, formatIdr } from "@/lib/format";
import type { DailyOrderDetail } from "@/components/inventory/types";
import { DeliverySlotBadge, SourceBadge } from "@/components/orders/daily-order-form-dialog";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

type Props = {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (order: DailyOrderDetail) => void;
  onDeleted: () => void;
  onInvoiced: (invoiceId: string) => void;
};

export function OrderDetailModal({ orderId, open, onClose, onEdit, onDeleted, onInvoiced }: Props) {
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
    mutationFn: () => api.delete(`/daily-orders/${orderId}`),
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
              {/* Info header */}
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
                  <OrderStatusBadge status={order.status} />
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
                        <TableCell><DeliverySlotBadge slot={l.deliverySlot} /></TableCell>
                        <TableCell><SourceBadge source={l.source} /></TableCell>
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
              disabled={!order}
              onClick={() => order && onEdit(order)}
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
              title={order?.status !== "confirmed" ? "Ubah status ke Confirmed dulu" : ""}
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

      {/* Confirm delete from modal */}
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
