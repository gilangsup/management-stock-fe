"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ApiListResponse, FinishedProductStockMovementRow } from "@/components/inventory/types";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatIntegerQty } from "@/lib/format";

const PAGE_SIZE = 15;

function formatDateTimeId(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function eventDateLabel(row: FinishedProductStockMovementRow): string {
  if (row.direction === "in" && row.productionDate) return formatDate(row.productionDate);
  if (row.direction === "out" && row.pickupDate) return formatDate(row.pickupDate);
  return "—";
}

export default function RiwayatStokBarangJadiPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<"" | "in" | "out">("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [picSearchInput, setPicSearchInput] = useState("");
  const [debouncedPicSearch, setDebouncedPicSearch] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");

  const [editRow, setEditRow] = useState<FinishedProductStockMovementRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<FinishedProductStockMovementRow | null>(null);

  const [editQty, setEditQty] = useState("");
  const [editPic, setEditPic] = useState("");
  const [editProductionDate, setEditProductionDate] = useState("");
  const [editPickupDate, setEditPickupDate] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPicSearch(picSearchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [picSearchInput]);

  useEffect(() => {
    setPage(1);
  }, [direction, debouncedSearch, debouncedPicSearch, eventDateFrom, eventDateTo]);

  useEffect(() => {
    if (!editRow) return;
    setEditQty(String(editRow.quantity));
    setEditPic(editRow.picName);
    const pd = editRow.productionDate;
    const pk = editRow.pickupDate;
    setEditProductionDate(pd ? pd.slice(0, 10) : "");
    setEditPickupDate(pk ? pk.slice(0, 10) : "");
  }, [editRow]);

  const list = useQuery({
    queryKey: [
      "finished-product-stock-movements",
      page,
      direction,
      debouncedSearch,
      debouncedPicSearch,
      eventDateFrom,
      eventDateTo,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (direction) params.direction = direction;
      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedPicSearch) params.picSearch = debouncedPicSearch;
      if (eventDateFrom) params.eventDateFrom = eventDateFrom;
      if (eventDateTo) params.eventDateTo = eventDateTo;
      const { data } = await api.get<ApiListResponse<FinishedProductStockMovementRow>>(
        "/finished-products/stock-movements",
        { params },
      );
      return data;
    },
  });

  const patchMovement = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const q = Math.floor(Number(editQty));
      if (!Number.isFinite(q) || q < 1) throw new Error("QTY");
      const body: Record<string, unknown> = {
        quantity: q,
        picName: editPic.trim(),
      };
      if (editRow.direction === "in") {
        if (!editProductionDate) throw new Error("DATE");
        body.productionDate = editProductionDate;
      } else {
        if (!editPickupDate) throw new Error("DATE");
        body.pickupDate = editPickupDate;
      }
      const { data } = await api.patch<{ success: boolean; data: FinishedProductStockMovementRow }>(
        `/finished-products/stock-movements/${editRow.id}`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Riwayat diperbarui");
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ["finished-product-stock-movements"] });
      qc.invalidateQueries({ queryKey: ["finished-products"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        if (err.message === "QTY") {
          toast.error("Kuantitas harus bilangan bulat ≥ 1.");
          return;
        }
        if (err.message === "DATE") {
          toast.error("Lengkapi tanggal kejadian.");
          return;
        }
      }
      toast.error(getApiErrorMessage(err, "Gagal memperbarui riwayat"));
    },
  });

  const deleteMovement = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finished-products/stock-movements/${id}`);
    },
    onSuccess: () => {
      toast.success("Riwayat dihapus");
      setDeleteRow(null);
      qc.invalidateQueries({ queryKey: ["finished-product-stock-movements"] });
      qc.invalidateQueries({ queryKey: ["finished-products"] });
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, "Gagal menghapus riwayat")),
  });

  const total = list.data?.meta.total ?? 0;
  const limit = list.data?.meta.limit ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const canSubmitEdit =
    editRow &&
    editPic.trim() &&
    Number.isFinite(Math.floor(Number(editQty))) &&
    Math.floor(Number(editQty)) >= 1 &&
    (editRow.direction === "in" ? !!editProductionDate : !!editPickupDate);

  return (
    <>
      <PageHeader
        title="Riwayat stok barang jadi"
        description="Riwayat stok masuk dan keluar. Tanggal kejadian = tanggal pembuatan (masuk) atau tanggal pengambilan (keluar)."
      />

      <div className="surface-panel space-y-4 rounded-2xl border border-border p-4">
        <Tabs
          value={direction === "" ? "all" : direction}
          onValueChange={(v) => setDirection(v === "all" ? "" : (v as "in" | "out"))}
          className="w-full"
        >
          <TabsList variant="pill" className="w-full justify-start">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="in">Masuk</TabsTrigger>
            <TabsTrigger value="out">Keluar</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2 sm:col-span-2">
            <Label>Cari nama / kode barang</Label>
            <Input
              placeholder="Mis. risol, SM001…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Filter nama PIC</Label>
            <Input
              placeholder="Partial match nama PIC…"
              value={picSearchInput}
              onChange={(e) => setPicSearchInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal kejadian dari</Label>
            <DateField value={eventDateFrom} onChange={setEventDateFrom} placeholder="Opsional" />
          </div>
          <div className="space-y-2">
            <Label>Tanggal kejadian sampai</Label>
            <DateField value={eventDateTo} onChange={setEventDateTo} placeholder="Opsional" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
              setPicSearchInput("");
              setDebouncedPicSearch("");
              setEventDateFrom("");
              setEventDateTo("");
              setDirection("");
            }}
          >
            Reset filter
          </Button>
        </div>
      </div>

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal kejadian</TableHead>
              <TableHead>Arah</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Dicatat</TableHead>
              <TableHead className="text-right">Saldo setelah</TableHead>
              <TableHead className="w-[120px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm">{eventDateLabel(row)}</TableCell>
                <TableCell>
                  <Badge variant={row.direction === "in" ? "default" : "secondary"}>
                    {row.direction === "in" ? "Masuk" : "Keluar"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.finishedProduct.name}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {row.finishedProduct.itemCode}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatIntegerQty(row.quantity)}
                </TableCell>
                <TableCell className="text-sm">{row.picName}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTimeId(row.createdAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatIntegerQty(row.stockAfter)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditRow(row)}
                      aria-label="Ubah riwayat"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteRow(row)}
                      aria-label="Hapus riwayat"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!list.data?.data?.length && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {list.isLoading ? "Memuat…" : "Belum ada riwayat untuk filter ini."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <p className="border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          Saldo setelah = sisa stok kumulatif tepat setelah transaksi tersebut (historis). Mengubah
          atau menghapus riwayat otomatis menghitung ulang saldo seluruh baris produk di server.
        </p>
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah riwayat stok</DialogTitle>
            {editRow ? (
              <p className="text-sm text-muted-foreground">
                {editRow.direction === "in" ? "Stok masuk" : "Stok keluar"} ·{" "}
                <span className="font-medium text-foreground">{editRow.finishedProduct.name}</span>{" "}
                <span className="font-mono">({editRow.finishedProduct.itemCode})</span>
              </p>
            ) : null}
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Kuantitas</Label>
              <Input
                inputMode="numeric"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                disabled={patchMovement.isPending}
              />
            </div>
            {editRow?.direction === "in" ? (
              <div className="space-y-2">
                <Label>Tanggal pembuatan</Label>
                <DateField value={editProductionDate} onChange={setEditProductionDate} />
              </div>
            ) : null}
            {editRow?.direction === "out" ? (
              <div className="space-y-2">
                <Label>Tanggal pengambilan</Label>
                <DateField value={editPickupDate} onChange={setEditPickupDate} />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Nama PIC</Label>
              <Input
                value={editPic}
                onChange={(e) => setEditPic(e.target.value)}
                disabled={patchMovement.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!canSubmitEdit || patchMovement.isPending}
              onClick={() => patchMovement.mutate()}
            >
              {patchMovement.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus riwayat?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {deleteRow ? (
                <>
                  {deleteRow.direction === "in" ? "Masuk" : "Keluar"} ·{" "}
                  {deleteRow.finishedProduct.name} · qty {formatIntegerQty(deleteRow.quantity)} · PIC{" "}
                  {deleteRow.picName}. Stok master akan disesuaikan di server.
                </>
              ) : null}
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteRow(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMovement.isPending}
              onClick={() => deleteRow && deleteMovement.mutate(deleteRow.id)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
