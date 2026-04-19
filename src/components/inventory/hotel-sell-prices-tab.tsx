"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
                <TableCell className="font-mono text-sm font-medium text-primary">
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
                <TableCell className="text-right tabular-nums text-success">
                  {formatMarginPercent(row.marginPercent)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/30"
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
  const qc = useQueryClient();
  const [hotelId, setHotelId] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [hotelDialogOpen, setHotelDialogOpen] = useState(false);
  const [newHotelName, setNewHotelName] = useState("");

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ success?: boolean; data: Hotel[] }>("/hotels");
      return data.data;
    },
    staleTime: 60_000,
  });

  const createHotel = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: Hotel }>("/hotels", { name: newHotelName.trim() });
      return data.data;
    },
    onSuccess: (h) => {
      toast.success("Hotel ditambahkan");
      setHotelDialogOpen(false);
      setNewHotelName("");
      setHotelId(h.id);
      qc.invalidateQueries({ queryKey: ["hotels"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan hotel")),
  });

  const hotelsList = hotels.data ?? [];
  const firstHotelId = hotelsList[0]?.id ?? "";
  const activeHotelId = hotelId || firstHotelId;

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Master hotel</CardTitle>
            <CardDescription>
              Daftar hotel dipakai di penukaran faktur dan harga jual per barang jadi. Tambah hotel
              baru di sini sebelum mengatur harga.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-primary/30 bg-primary/5 hover:bg-primary/10"
            onClick={() => setHotelDialogOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Tambah hotel
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-4 pt-0">
          <div className="surface-table-wrap border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama hotel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotelsList.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                      {h.name}
                    </TableCell>
                  </TableRow>
                ))}
                {!hotelsList.length && (
                  <TableRow>
                    <TableCell className="h-16 text-center text-muted-foreground">
                      {hotels.isLoading ? "Memuat…" : "Belum ada hotel — gunakan Tambah hotel."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={hotelDialogOpen} onOpenChange={setHotelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hotel baru</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Nama akan muncul di daftar hotel dan bisa dipilih saat penukaran faktur.
            </p>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-hotel-name">Nama hotel</Label>
            <Input
              id="new-hotel-name"
              value={newHotelName}
              onChange={(e) => setNewHotelName(e.target.value)}
              placeholder="Contoh: Hotel Bahari"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newHotelName.trim() && !createHotel.isPending) {
                  e.preventDefault();
                  createHotel.mutate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setHotelDialogOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!newHotelName.trim() || createHotel.isPending}
              onClick={() => createHotel.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Harga jual per barang
        </h3>
      </div>

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
        <p className="rounded-lg border border-dashed border-primary/30 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Tambah hotel di bagian <strong className="text-foreground">Master hotel</strong> di atas,
          lalu pilih hotel untuk mengisi harga jual.
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
