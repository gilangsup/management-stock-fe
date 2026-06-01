"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Loader2, Plus, Trash2, X } from "lucide-react";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatIdr } from "@/lib/format";
import { labelForHotelValue } from "@/lib/select-labels";
import type { DailyOrderDetail, HotelFinishedSellPriceRow } from "@/components/inventory/types";
import type { SalesPreviewLine } from "@/types/sales";

type Hotel = { id: string | number; name: string };

type DraftLine = {
  key: string;
  finishedProductId: string;
  preview: SalesPreviewLine | null;
  qty: string;
};

function newLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    finishedProductId: "",
    preview: null,
    qty: "1",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (invoiceId: string) => void;
  editId?: string | null;
};

export function SalesTransactionFormDialog({ open, onOpenChange, onSuccess, editId }: Props) {
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [hotelId, setHotelId] = useState("");
  const [saleDate, setSaleDate] = useState(today);
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine()]);
  const [importOrderId, setImportOrderId] = useState<string | null>(null);
  const isEditMode = !!editId;

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
    enabled: open,
    staleTime: 60_000,
  });

  // Confirmed daily orders for selected hotel (for import)
  const confirmedOrders = useQuery({
    queryKey: ["daily-orders-confirmed", hotelId],
    queryFn: async () => {
      const { data } = await api.get<{ data: { id: string; orderDate: string; poNumber: string | null; lineCount: number }[] }>(
        "/daily-orders",
        { params: { hotelId, status: "confirmed", limit: 50 } },
      );
      return data.data;
    },
    enabled: open && Boolean(hotelId),
    staleTime: 30_000,
  });

  const importOrderDetail = useQuery({
    queryKey: ["daily-orders", importOrderId],
    queryFn: async () => {
      const { data } = await api.get<{ data: DailyOrderDetail }>(`/daily-orders/${importOrderId}`);
      return data.data;
    },
    enabled: Boolean(importOrderId),
  });

  // Fetch detail faktur yang diedit
  const editDetail = useQuery({
    queryKey: ["sales-transaction-edit-detail", editId],
    queryFn: async () => {
      const { data } = await api.get<{
        data: {
          id: string;
          hotelId: string;
          saleDate: string;
          lines: { finishedProductId: string; qty: string }[];
        };
      }>(`/sales-transactions/${editId}`);
      return data.data;
    },
    enabled: open && isEditMode && !!editId,
    staleTime: 0,
  });

  // Pre-fill form ketika edit data selesai dimuat
  useEffect(() => {
    if (!isEditMode || !editDetail.data) return;
    setHotelId(editDetail.data.hotelId);
    setSaleDate(editDetail.data.saleDate);
    const draftLines: DraftLine[] = editDetail.data.lines.map((l) => ({
      key: crypto.randomUUID(),
      finishedProductId: String(l.finishedProductId),
      preview: null,
      qty: String(Number(l.qty)),
    }));
    setLines(draftLines.length ? draftLines : [newLine()]);
    // Load preview for each line
    for (const dl of draftLines) {
      if (dl.finishedProductId && editDetail.data.hotelId) {
        void loadPreview(dl.key, editDetail.data.hotelId, dl.finishedProductId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDetail.data]);

  const pricedProducts = useQuery({
    queryKey: ["finished-sell-prices-for-sale", hotelId],
    queryFn: async () => {
      const { data } = await api.get<{
        success?: boolean;
        data: HotelFinishedSellPriceRow[];
      }>(`/hotels/${hotelId}/finished-sell-prices`);
      return data.data.filter((r) => r.sellPrice != null && String(r.sellPrice).trim() !== "");
    },
    enabled: open && Boolean(hotelId),
  });

  const loadPreview = useCallback(
    async (lineKey: string, hid: string, finishedProductId: string) => {
      if (!hid || !finishedProductId) return;
      setLines((prev) =>
        prev.map((l) => (l.key === lineKey ? { ...l, preview: null } : l)),
      );
      try {
        const { data } = await api.get<{ data: SalesPreviewLine }>(
          "/sales-transactions/preview-line",
          { params: { hotelId: hid, finishedProductId } },
        );
        setLines((prev) =>
          prev.map((l) =>
            l.key === lineKey ? { ...l, preview: data.data } : l,
          ),
        );
      } catch (e) {
        toast.error(getApiErrorMessage(e, "Gagal memuat preview baris"));
        setLines((prev) =>
          prev.map((l) =>
            l.key === lineKey ? { ...l, preview: null, finishedProductId: "" } : l,
          ),
        );
      }
    },
    [],
  );

  const bodyLines = useMemo(
    () =>
      lines
        .filter((l) => l.finishedProductId && Number(l.qty) > 0)
        .map((l) => ({ finishedProductId: l.finishedProductId, qty: Number(l.qty) })),
    [lines],
  );

  const createTx = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { id: string } }>("/sales-transactions", {
        hotelId,
        saleDate,
        lines: bodyLines,
      });
      return data.data;
    },
    onSuccess: (res) => {
      toast.success("Faktur penjualan tersimpan");
      qc.invalidateQueries({ queryKey: ["sales-transactions"] });
      onOpenChange(false);
      resetForm();
      onSuccess(res.id);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan faktur")),
  });

  const updateTx = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<{ data: { id: string } }>(`/sales-transactions/${editId}`, {
        saleDate,
        lines: bodyLines,
      });
      return data.data;
    },
    onSuccess: (res) => {
      toast.success("Faktur penjualan berhasil diperbarui");
      qc.invalidateQueries({ queryKey: ["sales-transactions"] });
      qc.invalidateQueries({ queryKey: ["sales-transaction-edit-detail", editId] });
      onOpenChange(false);
      resetForm();
      onSuccess(res.id);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal memperbarui faktur")),
  });

  // Auto-apply import when detail loads
  useEffect(() => {
    if (importOrderId && importOrderDetail.data?.id === importOrderId) {
      const order = importOrderDetail.data;
      const importedLines: DraftLine[] = order.lines.map((l) => ({
        key: crypto.randomUUID(),
        finishedProductId: l.finishedProductId,
        preview: null,
        qty: String(Number(l.qty)),
      }));
      setLines(importedLines.length ? importedLines : [newLine()]);
      for (const l of importedLines) {
        if (l.finishedProductId && hotelId) {
          void loadPreview(l.key, hotelId, l.finishedProductId);
        }
      }
      setImportOrderId(null);
      toast.success(`${order.lines.length} item diimpor dari pesanan ${order.poNumber ?? order.id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when detail loads
  }, [importOrderDetail.data]);

  // When import order detail loads, pre-fill lines
  const handleImportOrder = useCallback(
    (order: DailyOrderDetail) => {
      const importedLines: DraftLine[] = order.lines.map((l) => ({
        key: crypto.randomUUID(),
        finishedProductId: l.finishedProductId,
        preview: null,
        qty: String(Number(l.qty)),
      }));
      setLines(importedLines.length ? importedLines : [newLine()]);
      // Trigger preview load for each imported line
      for (const l of importedLines) {
        if (l.finishedProductId && hotelId) {
          void loadPreview(l.key, hotelId, l.finishedProductId);
        }
      }
      setImportOrderId(null);
      toast.success(`${order.lines.length} item diimpor dari pesanan ${order.poNumber ?? order.id}`);
    },
    [hotelId, loadPreview],
  );

  function resetForm() {
    setHotelId("");
    setSaleDate(today);
    setLines([newLine()]);
    setImportOrderId(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  const grandPreview = useMemo(() => {
    let sum = 0;
    for (const l of lines) {
      if (!l.preview || !l.qty) continue;
      const q = Number(l.qty);
      const p = Number(l.preview.sellPrice);
      if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
    }
    return sum;
  }, [lines]);

  const canSubmit =
    hotelId &&
    saleDate &&
    lines.some((l) => l.finishedProductId && l.preview && Number(l.qty) > 0);
  const isPending = createTx.isPending || updateTx.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit faktur penjualan" : "Tambah faktur penjualan"}
          </DialogTitle>
        </DialogHeader>

        {isEditMode && editDetail.isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat data…</div>
        ) : (
        <div className="grid gap-4 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hotel</Label>
              {isEditMode ? (
                // Hotel terkunci saat edit (tidak bisa diubah karena mempengaruhi kode transaksi)
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
                  {labelForHotelValue(
                    (hotels.data ?? []).map((h) => ({ id: String(h.id), name: h.name })),
                    hotelId,
                  ) ?? hotelId}
                </div>
              ) : (
              <Select
                value={hotelId ? String(hotelId) : undefined}
                onValueChange={(v) => {
                  setHotelId(v != null && v !== "" ? String(v) : "");
                  setLines([newLine()]);
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Pilih hotel">
                    {labelForHotelValue(
                      (hotels.data ?? []).map((h) => ({
                        id: String(h.id),
                        name: h.name,
                      })),
                      hotelId,
                    ) ?? undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(hotels.data ?? []).map((h) => (
                    <SelectItem key={String(h.id)} value={String(h.id)}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tanggal penjualan</Label>
              <DateField value={saleDate} onChange={setSaleDate} />
            </div>
          </div>

          {/* ── Import dari Pesanan Harian ─────────────────────────────── */}
          {hotelId && (confirmedOrders.data?.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <ClipboardList className="size-4 text-primary shrink-0" />
                  <span className="font-medium text-primary">Import dari Pesanan Harian</span>
                  <span className="text-muted-foreground">
                    ({confirmedOrders.data?.length} confirmed tersedia)
                  </span>
                </div>
                {importOrderId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-6"
                    onClick={() => setImportOrderId(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              {!importOrderId ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(confirmedOrders.data ?? []).map((o) => (
                    <Button
                      key={o.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 border-primary/30 bg-white text-xs"
                      onClick={() => {
                        setImportOrderId(o.id);
                        if (importOrderDetail.data?.id === o.id) {
                          handleImportOrder(importOrderDetail.data);
                        }
                      }}
                    >
                      {o.poNumber ?? `Pesanan ${o.id}`} — {o.lineCount} item
                    </Button>
                  ))}
                </div>
              ) : importOrderDetail.isLoading ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Mengimpor…
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Barang jadi (harga dari master per hotel)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hotelId}
                onClick={() => setLines((ls) => [...ls, newLine()])}
              >
                <Plus className="mr-1 size-3.5" />
                Baris
              </Button>
            </div>

            {!hotelId ? (
              <p className="text-sm text-muted-foreground">Pilih hotel terlebih dahulu.</p>
            ) : pricedProducts.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat daftar harga…
              </p>
            ) : !pricedProducts.data?.length ? (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Belum ada harga jual untuk hotel ini. Atur di{" "}
                <strong className="font-medium text-foreground">Master Data → Harga hotel</strong>.
              </p>
            ) : null}

            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="space-y-2 rounded-xl border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Baris {idx + 1}</span>
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-7 shrink-0 text-destructive"
                      onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label className="text-xs">Barang jadi</Label>
                    <Select
                      value={line.finishedProductId ? String(line.finishedProductId) : undefined}
                      onValueChange={(v) => {
                        const fp = v != null && v !== "" ? String(v) : "";
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, finishedProductId: fp, preview: null, qty: l.qty || "1" }
                              : l,
                          ),
                        );
                        if (fp && hotelId) void loadPreview(line.key, hotelId, fp);
                      }}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Pilih barang (ada harga)">
                          {(() => {
                            const id = line.finishedProductId;
                            if (!id) return undefined;
                            const row = (pricedProducts.data ?? []).find(
                              (r) => String(r.finishedProductId) === String(id),
                            );
                            if (row) return `${row.itemCode} — ${row.name}`;
                            if (line.preview)
                              return `${line.preview.itemCode} — ${line.preview.name}`;
                            return undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(pricedProducts.data ?? []).map((r) => (
                          <SelectItem
                            key={String(r.finishedProductId)}
                            value={String(r.finishedProductId)}
                          >
                            {r.itemCode} — {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {line.preview ? (
                    <>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Kode / nama</span>
                        <p className="font-medium">
                          {line.preview.itemCode} · {line.preview.name}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Satuan</span>
                        <p>
                          {line.preview.unit.name}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({line.preview.unit.code})
                          </span>
                        </p>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Harga jual / unit</span>
                        <p className="font-mono tabular-nums">{formatIdr(line.preview.sellPrice)}</p>
                      </div>
                      <div className="space-y-1.5 lg:col-span-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={line.qty}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((l) =>
                                l.key === line.key ? { ...l, qty: e.target.value } : l,
                              ),
                            )
                          }
                        />
                      </div>
                      <div className="flex items-end text-sm lg:col-span-2">
                        <div>
                          <span className="text-muted-foreground">Subtotal baris</span>
                          <p className="font-semibold tabular-nums">
                            {formatIdr(
                              Number(line.qty || 0) * Number(line.preview.sellPrice || 0),
                            )}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : line.finishedProductId ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2">Memuat preview…</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total preview (server akan hitung ulang saat simpan)</span>
            <span className="font-bold tabular-nums">{formatIdr(grandPreview)}</span>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            className="btn-gradient border-0"
            disabled={!canSubmit || isPending || (isEditMode && editDetail.isLoading)}
            onClick={() => (isEditMode ? updateTx.mutate() : createTx.mutate())}
          >
            {isPending
              ? "Menyimpan…"
              : isEditMode
              ? "Simpan perubahan"
              : "Simpan faktur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
