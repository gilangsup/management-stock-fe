"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
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
import { formatIdr, formatMarginPercent } from "@/lib/format";
import { labelForHotelValue } from "@/lib/select-labels";
import type { HotelFinishedSellPriceRow } from "./types";

type Hotel = { id: string; name: string; address?: string | null };

type Props = { isAdmin: boolean };

function HotelSellPricesGrid({
  hotelId,
  appliedSearch,
  isAdmin,
}: {
  hotelId: string;
  appliedSearch: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [clearTarget, setClearTarget] = useState<HotelFinishedSellPriceRow | null>(null);

  const grid = useQuery({
    queryKey: ["hotel-sell-prices", hotelId, appliedSearch],
    enabled: Boolean(hotelId),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: HotelFinishedSellPriceRow[];
        meta: { hotelId: string; note: string };
      }>(`/hotels/${hotelId}/finished-sell-prices`, {
        params: appliedSearch.trim() ? { search: appliedSearch.trim() } : {},
      });
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async ({
      finishedProductId,
      sellPrice,
    }: {
      finishedProductId: string;
      sellPrice: number;
    }) => {
      const { data } = await api.put<{ success: boolean; data: HotelFinishedSellPriceRow }>(
        `/hotels/${hotelId}/finished-sell-prices/${finishedProductId}`,
        { sellPrice },
      );
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success("Harga jual disimpan");
      setEdits((prev) => {
        const next = { ...prev };
        delete next[vars.finishedProductId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["hotel-sell-prices"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan harga")),
  });

  const removePrice = useMutation({
    mutationFn: async (finishedProductId: string) => {
      await api.delete(`/hotels/${hotelId}/finished-sell-prices/${finishedProductId}`);
    },
    onSuccess: (_, finishedProductId) => {
      toast.success("Harga jual dihapus untuk barang ini");
      setClearTarget(null);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[finishedProductId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["hotel-sell-prices"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus")),
  });

  function displaySellInput(row: HotelFinishedSellPriceRow): string {
    if (row.finishedProductId in edits) return edits[row.finishedProductId];
    if (row.sellPrice != null) return String(Number(row.sellPrice));
    return "";
  }

  function saveRow(row: HotelFinishedSellPriceRow) {
    const raw = displaySellInput(row).trim();
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || n < 0) {
      toast.error("Isi harga jual yang valid");
      return;
    }
    upsert.mutate({ finishedProductId: row.finishedProductId, sellPrice: n });
  }

  return (
    <>
      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Barang jadi</TableHead>
              <TableHead className="text-right">Harga pokok</TableHead>
              <TableHead className="min-w-[140px]">Harga jual (hotel)</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(grid.data?.data ?? []).map((row) => (
              <TableRow key={row.finishedProductId}>
                <TableCell className="font-mono text-sm font-medium text-violet-800 dark:text-violet-200">
                  {row.itemCode}
                </TableCell>
                <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                  {row.name}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatIdr(row.costPrice)}
                </TableCell>
                <TableCell>
                  <Input
                    className="h-9 max-w-[160px]"
                    inputMode="decimal"
                    placeholder="Rp…"
                    value={displaySellInput(row)}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [row.finishedProductId]: e.target.value,
                      }))
                    }
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatMarginPercent(row.marginPercent)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-violet-200"
                      disabled={upsert.isPending}
                      onClick={() => saveRow(row)}
                    >
                      <Save className="mr-1 size-3" />
                      Simpan
                    </Button>
                    {isAdmin && row.sellPrice != null ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setClearTarget(row)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!grid.data?.data?.length && hotelId && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {grid.isLoading ? "Memuat…" : "Tidak ada barang jadi."}
                </TableCell>
              </TableRow>
            )}
            {!hotelId && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Pilih hotel untuk melihat grid harga.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!clearTarget} onOpenChange={(o) => !o && setClearTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus harga jual?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Harga jual <strong>{clearTarget?.name}</strong> untuk hotel ini akan dihapus (hanya
              admin). Bon nanti tidak bisa mengambil harga otomatis sampai diisi lagi.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setClearTarget(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removePrice.isPending || !clearTarget}
              onClick={() => clearTarget && removePrice.mutate(clearTarget.finishedProductId)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function HotelSellPricesTab({ isAdmin }: Props) {
  const [hotelId, setHotelId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ success?: boolean; data: Hotel[] }>("/hotels");
      return data.data;
    },
    staleTime: 60_000,
  });

  const hotelsList = hotels.data ?? [];
  const firstHotelId = hotelsList[0]?.id ?? "";
  const activeHotelId = hotelId || firstHotelId;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Setiap hotel punya harga jual sendiri per barang jadi. Bon/faktur cukup pilih barang dan
        jumlah — nominal mengambil dari master ini. Baris tanpa harga tampil kosong sampai Anda
        simpan.
      </p>

      <div className="surface-panel flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Hotel</Label>
            <Select
              value={activeHotelId ? String(activeHotelId) : undefined}
              onValueChange={(v) => setHotelId(v ?? "")}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Pilih hotel">
                  {(val) => labelForHotelValue(hotelsList, val) ?? undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {hotelsList.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cari barang</Label>
            <Input
              placeholder="Nama / kode barang jadi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
            }}
          >
            Reset pencarian
          </Button>
          <Button
            type="button"
            className="btn-gradient border-0"
            disabled={!activeHotelId}
            onClick={() => setAppliedSearch(search.trim())}
          >
            Terapkan
          </Button>
        </div>
      </div>

      {!hotelsList.length ? (
        <p className="rounded-lg border border-dashed border-violet-200/80 bg-violet-50/40 px-4 py-6 text-center text-sm text-muted-foreground dark:border-violet-500/30 dark:bg-violet-950/20">
          Belum ada hotel. Tambahkan dari halaman <strong>Penukaran faktur</strong> (tombol Tambah
          hotel).
        </p>
      ) : (
        <HotelSellPricesGrid
          key={activeHotelId}
          hotelId={activeHotelId}
          appliedSearch={appliedSearch}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
