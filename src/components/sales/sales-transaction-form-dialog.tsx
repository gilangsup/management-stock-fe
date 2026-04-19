"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import type { HotelFinishedSellPriceRow } from "@/components/inventory/types";
import type { SalesPreviewLine } from "@/types/sales";

type Hotel = { id: string; name: string };

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
};

export function SalesTransactionFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [hotelId, setHotelId] = useState("");
  const [saleDate, setSaleDate] = useState(today);
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine()]);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
    enabled: open,
    staleTime: 60_000,
  });

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

  const createTx = useMutation({
    mutationFn: async () => {
      const bodyLines = lines
        .filter((l) => l.finishedProductId && Number(l.qty) > 0)
        .map((l) => ({
          finishedProductId: l.finishedProductId,
          qty: Number(l.qty),
        }));
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

  function resetForm() {
    setHotelId("");
    setSaleDate(today);
    setLines([newLine()]);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah faktur penjualan</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hotel</Label>
              <Select
                value={hotelId || undefined}
                onValueChange={(v) => {
                  setHotelId(v ?? "");
                  setLines([newLine()]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih hotel" />
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
              <Label>Tanggal penjualan</Label>
              <DateField value={saleDate} onChange={setSaleDate} />
            </div>
          </div>

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
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Barang jadi</Label>
                    <Select
                      value={line.finishedProductId || undefined}
                      onValueChange={(v) => {
                        const fp = v ?? "";
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
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih barang (ada harga)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(pricedProducts.data ?? []).map((r) => (
                          <SelectItem key={r.finishedProductId} value={r.finishedProductId}>
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
                      <div className="space-y-1.5">
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
                      <div className="flex items-end text-sm">
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            className="btn-gradient border-0"
            disabled={!canSubmit || createTx.isPending}
            onClick={() => createTx.mutate()}
          >
            {createTx.isPending ? "Menyimpan…" : "Simpan faktur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
