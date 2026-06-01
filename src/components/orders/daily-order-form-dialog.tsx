"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatIdr } from "@/lib/format";
import type {
  DailyOrderDetail,
  DailyOrderLine,
  DeliverySlot,
  FinishedProductRow,
  OrderSource,
  OrderStatus,
} from "@/components/inventory/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Hotel = { id: string; name: string };

type DraftLine = {
  key: string;
  finishedProductId: string;
  deliverySlot: DeliverySlot;
  qty: string;
  unitPrice: string;
  source: OrderSource;
  notes: string;
};

function newDraftLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    finishedProductId: "",
    deliverySlot: "unspecified",
    qty: "1",
    unitPrice: "0",
    source: "internal",
    notes: "",
  };
}

function lineFromExisting(l: DailyOrderLine): DraftLine {
  return {
    key: l.id,
    finishedProductId: l.finishedProductId,
    deliverySlot: l.deliverySlot,
    qty: String(Number(l.qty)),
    unitPrice: String(Number(l.unitPrice)),
    source: l.source,
    notes: l.notes ?? "",
  };
}

export const SLOT_LABELS: Record<DeliverySlot, string> = {
  CB1: "CB 1 — Pagi (05:00–07:00)",
  CB2: "CB 2 — Siang (11:00–12:00)",
  CB3: "CB 3 — Sore (15:00–17:00)",
  unspecified: "Tidak ada preferensi",
};

export const SOURCE_LABELS: Record<OrderSource, string> = {
  internal: "Buat sendiri",
  vendor: "Beli vendor",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: DailyOrderDetail | null;
  onSuccess: (orderId: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyOrderFormDialog({ open, onOpenChange, editData, onSuccess }: Props) {
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isEdit = Boolean(editData);

  const [hotelId, setHotelId] = useState(editData?.hotel.id ?? "");
  const [orderDate, setOrderDate] = useState(editData?.orderDate ?? today);
  const [deliveryDate, setDeliveryDate] = useState(editData?.deliveryDate ?? "");
  const [poNumber, setPoNumber] = useState(editData?.poNumber ?? "");
  const [notes, setNotes] = useState(editData?.notes ?? "");
  const [status, setStatus] = useState<OrderStatus>(editData?.status ?? "draft");
  const [lines, setLines] = useState<DraftLine[]>(() =>
    editData?.lines.length ? editData.lines.map(lineFromExisting) : [newDraftLine()],
  );

  // Sync edit data when dialog opens
  useEffect(() => {
    if (open && editData) {
      setHotelId(editData.hotel.id);
      setOrderDate(editData.orderDate);
      setDeliveryDate(editData.deliveryDate ?? "");
      setPoNumber(editData.poNumber ?? "");
      setNotes(editData.notes ?? "");
      setStatus(editData.status);
      setLines(editData.lines.length ? editData.lines.map(lineFromExisting) : [newDraftLine()]);
    }
  }, [open, editData]);

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const products = useQuery({
    queryKey: ["finished-products-all"],
    queryFn: async () => {
      const { data } = await api.get<{ data: FinishedProductRow[] }>("/finished-products", {
        params: { limit: 500 },
      });
      return data.data;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const productMap = useMemo(() => {
    const m = new Map<string, FinishedProductRow>();
    for (const p of products.data ?? []) m.set(p.id, p);
    return m;
  }, [products.data]);

  // Fetch master sell prices untuk hotel yang dipilih
  const hotelSellPrices = useQuery({
    queryKey: ["hotel-sell-prices-order", hotelId],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { finishedProductId: string; sellPrice: string | null }[];
      }>(`/hotels/${hotelId}/finished-sell-prices`);
      return data.data;
    },
    enabled: open && Boolean(hotelId),
    staleTime: 60_000,
  });

  // Map finishedProductId → sellPrice untuk lookup cepat
  const hotelPriceMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of hotelSellPrices.data ?? []) m.set(p.finishedProductId, p.sellPrice);
    return m;
  }, [hotelSellPrices.data]);

  // Saat hotel berubah, update unitPrice semua baris yang sudah punya produk
  useEffect(() => {
    if (!hotelId || !hotelSellPrices.data) return;
    setLines((prev) =>
      prev.map((l) => {
        if (!l.finishedProductId) return l;
        const price = hotelPriceMap.get(l.finishedProductId);
        if (price != null && Number(price) > 0) {
          return { ...l, unitPrice: String(Number(price)) };
        }
        return l;
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, hotelSellPrices.data]);

  // ---------------------------------------------------------------------------
  // Computed grand total preview
  // ---------------------------------------------------------------------------

  const grandTotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const q = Number(l.qty);
        const p = Number(l.unitPrice);
        return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
      }, 0),
    [lines],
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const updateLine = useCallback(
    (key: string, patch: Partial<DraftLine>) =>
      setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l))),
    [],
  );

  function resetForm() {
    setHotelId("");
    setOrderDate(today);
    setDeliveryDate("");
    setPoNumber("");
    setNotes("");
    setStatus("draft");
    setLines([newDraftLine()]);
  }

  function handleOpenChange(next: boolean) {
    if (!next && !isEdit) resetForm();
    onOpenChange(next);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        orderDate,
        deliveryDate: deliveryDate || undefined,
        hotelId,
        poNumber: poNumber || undefined,
        notes: notes || undefined,
        status,
        lines: lines
          .filter((l) => l.finishedProductId && Number(l.qty) > 0)
          .map((l, i) => ({
            finishedProductId: l.finishedProductId,
            deliverySlot: l.deliverySlot,
            qty: Number(l.qty),
            unitPrice: Number(l.unitPrice),
            source: l.source,
            notes: l.notes || undefined,
            sortOrder: i,
          })),
      };
      if (isEdit && editData) {
        const { data } = await api.patch<{ data: { id: string } }>(
          `/daily-orders/${editData.id}`,
          body,
        );
        return data.data;
      }
      const { data } = await api.post<{ data: { id: string } }>("/daily-orders", body);
      return data.data;
    },
    onSuccess: (res) => {
      toast.success(isEdit ? "Pesanan diperbarui" : "Pesanan disimpan");
      qc.invalidateQueries({ queryKey: ["daily-orders"] });
      if (!isEdit) resetForm();   // reset dulu sebelum tutup dialog
      onOpenChange(false);
      onSuccess(res.id);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan pesanan")),
  });

  const canSubmit =
    hotelId &&
    orderDate &&
    lines.some((l) => l.finishedProductId && Number(l.qty) > 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-1rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit pesanan harian" : "Tambah pesanan harian"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Hotel <span className="text-destructive">*</span></Label>
              <Select
                value={hotelId || undefined}
                onValueChange={(v) => setHotelId(v ?? "")}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Pilih hotel">
                    {hotels.data?.find((h) => h.id === hotelId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(hotels.data ?? []).map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tanggal PO / pesanan <span className="text-destructive">*</span></Label>
              <DateField value={orderDate} onChange={setOrderDate} />
            </div>

            <div className="space-y-2">
              <Label>Tanggal pengiriman</Label>
              <DateField value={deliveryDate} onChange={setDeliveryDate} placeholder="Opsional" />
            </div>

            <div className="space-y-2">
              <Label>No. PO</Label>
              <Input
                placeholder="Contoh: 1LWP200015851"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v ?? "draft") as OrderStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan tambahan…"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          {/* ── Lines ──────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Item pesanan</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((ls) => [...ls, newDraftLine()])}
              >
                <Plus className="mr-1 size-3.5" />
                Tambah baris
              </Button>
            </div>

            {products.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat produk…
              </p>
            ) : null}

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const product = productMap.get(line.finishedProductId);
                return (
                  <div
                    key={line.key}
                    className="rounded-xl border border-border bg-muted/20 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Baris {idx + 1}
                      </span>
                      {lines.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 text-destructive"
                          onClick={() =>
                            setLines((ls) => ls.filter((l) => l.key !== line.key))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Product */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Produk</Label>
                        <Select
                          value={line.finishedProductId || undefined}
                          onValueChange={(v) => {
                            const productId = v ?? "";
                            const hotelPrice = productId ? hotelPriceMap.get(productId) : undefined;
                            const patch: Partial<DraftLine> = { finishedProductId: productId };
                            if (hotelPrice != null && Number(hotelPrice) > 0) {
                              patch.unitPrice = String(Number(hotelPrice));
                            }
                            updateLine(line.key, patch);
                          }}
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue placeholder="Pilih produk">
                              {(() => {
                                const p = productMap.get(line.finishedProductId);
                                return p ? `${p.itemCode} — ${p.name}` : undefined;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {(products.data ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.itemCode} — {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {product ? (
                          <p className="text-xs text-muted-foreground">
                            Satuan: {product.unit?.name ?? "—"}
                          </p>
                        ) : null}
                      </div>

                      {/* Delivery slot */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Jam pengiriman</Label>
                        <Select
                          value={line.deliverySlot}
                          onValueChange={(v) =>
                            updateLine(line.key, { deliverySlot: (v ?? "unspecified") as DeliverySlot })
                          }
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(SLOT_LABELS) as [DeliverySlot, string][]).map(
                              ([val, label]) => (
                                <SelectItem key={val} value={val}>
                                  {label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Source */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Asal item</Label>
                        <Select
                          value={line.source}
                          onValueChange={(v) =>
                            updateLine(line.key, { source: (v ?? "internal") as OrderSource })
                          }
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Buat sendiri</SelectItem>
                            <SelectItem value="vendor">Beli vendor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Qty */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={line.qty}
                          onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        />
                      </div>

                      {/* Unit price */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Harga satuan (PO)</Label>
                        <Input
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                        />
                        {(() => {
                          if (!line.finishedProductId || !hotelId) return null;
                          const mp = hotelPriceMap.get(line.finishedProductId);
                          if (mp == null) return null;
                          if (Number(mp) <= 0)
                            return (
                              <p className="text-[11px] text-amber-600">
                                Harga master belum diset untuk hotel ini.
                              </p>
                            );
                          return (
                            <p className="text-[11px] text-primary/70">
                              Master: {formatIdr(mp)}
                            </p>
                          );
                        })()}
                      </div>

                      {/* Subtotal */}
                      <div className="flex items-end text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Subtotal</span>
                          <p className="font-semibold tabular-nums">
                            {formatIdr(Number(line.qty || 0) * Number(line.unitPrice || 0))}
                          </p>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <Label className="text-xs">Catatan baris</Label>
                        <Input
                          placeholder="Opsional"
                          value={line.notes}
                          onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Grand total ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total PO (preview)</span>
            <span className="font-bold tabular-nums text-base">{formatIdr(grandTotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            className="btn-gradient border-0"
            disabled={!canSubmit || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Menyimpan…
              </>
            ) : isEdit ? (
              "Simpan perubahan"
            ) : (
              "Simpan pesanan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Re-export badge helpers for use in the page
export function DeliverySlotBadge({ slot }: { slot: DeliverySlot }) {
  const variants: Record<DeliverySlot, string> = {
    CB1: "bg-blue-100 text-blue-800 border-blue-200",
    CB2: "bg-amber-100 text-amber-800 border-amber-200",
    CB3: "bg-purple-100 text-purple-800 border-purple-200",
    unspecified: "bg-muted text-muted-foreground border-border",
  };
  const short: Record<DeliverySlot, string> = {
    CB1: "CB 1",
    CB2: "CB 2",
    CB3: "CB 3",
    unspecified: "—",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${variants[slot]}`}
    >
      {short[slot]}
    </span>
  );
}

export function SourceBadge({ source }: { source: OrderSource }) {
  return source === "internal" ? (
    <Badge variant="secondary" className="text-[11px]">
      Sendiri
    </Badge>
  ) : (
    <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 text-[11px]">
      Vendor
    </Badge>
  );
}
