"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Wheat } from "lucide-react";
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
import { formatDecimalQty, formatIdr } from "@/lib/format";
import { labelForUnitValue } from "@/lib/select-labels";
import type { ApiListResponse, RawMaterialRow, UnitRow } from "./types";

const PAGE_SIZE = 15;

type Props = { isAdmin: boolean; units: UnitRow[] | undefined; unitsLoading: boolean };

export function RawMaterialsTab({ isAdmin, units, unitsLoading }: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<RawMaterialRow | null>(null);
  const [adjustRow, setAdjustRow] = useState<RawMaterialRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<RawMaterialRow | null>(null);

  const [form, setForm] = useState({
    name: "",
    unitId: "",
    unitPrice: "0",
    quantityOnHand: "0",
  });
  const [adjustDelta, setAdjustDelta] = useState("");

  const list = useQuery({
    queryKey: ["raw-materials", { page, search, unitFilter }],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<RawMaterialRow>>("/raw-materials", {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(unitFilter ? { unitId: unitFilter } : {}),
        },
      });
      return data;
    },
  });

  const total = list.data?.meta.total ?? 0;
  const limit = list.data?.meta.limit ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; data: RawMaterialRow }>(
        "/raw-materials",
        {
          name: form.name.trim(),
          unitId: form.unitId,
          unitPrice: Number(form.unitPrice) || 0,
          quantityOnHand: Number(form.quantityOnHand) || 0,
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Bahan baku ditambahkan");
      setCreateOpen(false);
      setForm({ name: "", unitId: "", unitPrice: "0", quantityOnHand: "0" });
      qc.invalidateQueries({ queryKey: ["raw-materials"] });
      qc.invalidateQueries({ queryKey: ["dash-inventory"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan")),
  });

  const patch = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const { data } = await api.patch<{ success: boolean; data: RawMaterialRow }>(
        `/raw-materials/${editRow.id}`,
        {
          name: form.name.trim(),
          unitId: form.unitId || undefined,
          unitPrice: Number(form.unitPrice),
          quantityOnHand: Number(form.quantityOnHand),
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Bahan baku diperbarui");
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ["raw-materials"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal memperbarui")),
  });

  const adjust = useMutation({
    mutationFn: async () => {
      if (!adjustRow) return;
      const d = Number(adjustDelta);
      if (!Number.isFinite(d) || d === 0) throw new Error("invalid");
      await api.patch(`/raw-materials/${adjustRow.id}`, { quantityDelta: d });
    },
    onSuccess: () => {
      toast.success("Stok disesuaikan");
      setAdjustRow(null);
      setAdjustDelta("");
      qc.invalidateQueries({ queryKey: ["raw-materials"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyesuaikan stok")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/raw-materials/${id}`);
    },
    onSuccess: () => {
      toast.success("Bahan baku dihapus");
      setDeleteRow(null);
      qc.invalidateQueries({ queryKey: ["raw-materials"] });
      qc.invalidateQueries({ queryKey: ["dash-inventory"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus")),
  });

  const openEdit = (row: RawMaterialRow) => {
    setForm({
      name: row.name,
      unitId: row.unit.id,
      unitPrice: String(Number(row.unitPrice)),
      quantityOnHand: String(Number(row.quantityOnHand)),
    });
    setEditRow(row);
  };

  const firstUnitId = units?.[0]?.id ?? "";
  const canSubmitCreate =
    form.name.trim() && form.unitId && !create.isPending && !unitsLoading && !!units?.length;

  const filterBar = useMemo(
    () => (
      <div className="surface-panel flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Cari nama / kode</Label>
            <Input
              placeholder="Beras, RM000001…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Filter satuan</Label>
            <Select
              value={unitFilter ? String(unitFilter) : "__all__"}
              onValueChange={(v) => setUnitFilter(v === "__all__" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Semua satuan">
                  {(val) =>
                    val === "__all__"
                      ? "Semua satuan"
                      : (labelForUnitValue(units, val) ?? undefined)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua satuan</SelectItem>
                {(units ?? []).map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} ({u.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setUnitFilter("");
              setPage(1);
            }}
          >
            Reset
          </Button>
          <Button type="button" className="btn-gradient border-0" onClick={() => setPage(1)}>
            Terapkan
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20"
            disabled={!units?.length}
            onClick={() => {
              setForm({
                name: "",
                unitId: firstUnitId,
                unitPrice: "0",
                quantityOnHand: "0",
              });
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Tambah
          </Button>
        </div>
      </div>
    ),
    [search, unitFilter, units, firstUnitId],
  );

  return (
    <div className="space-y-4">
      {filterBar}

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Harga / satuan</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="w-[200px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {row.itemCode ?? "—"}
                </TableCell>
                <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                  {row.name}
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{row.unit.name}</span>{" "}
                  <span className="text-xs text-slate-500">({row.unit.code})</span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatIdr(row.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-emerald-800 dark:text-emerald-200">
                  {formatDecimalQty(row.quantityOnHand)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-emerald-200"
                      onClick={() => {
                        setAdjustRow(row);
                        setAdjustDelta("");
                      }}
                    >
                      <Wheat className="mr-1 size-3" />
                      Stok
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="mr-1 size-3" />
                      Ubah
                    </Button>
                    {isAdmin ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteRow(row)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!list.data?.data?.length && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {list.isLoading ? "Memuat…" : "Belum ada bahan baku."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-2 border-t border-emerald-100/80 bg-gradient-to-r from-emerald-50/40 to-teal-50/30 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:from-emerald-950/15 dark:to-teal-950/15 dark:text-slate-400">
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bahan baku baru</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Kode barang diisi otomatis oleh server (format RM + nomor urut).
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Beras medium, Tepung terigu…"
              />
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <Select
                value={form.unitId ? String(form.unitId) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, unitId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih satuan">
                    {(val) => labelForUnitValue(units, val) ?? undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Harga per satuan (Rp)</Label>
                <Input
                  inputMode="decimal"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Stok awal</Label>
                <Input
                  inputMode="decimal"
                  value={form.quantityOnHand}
                  onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!canSubmitCreate}
              onClick={() => create.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah bahan baku</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <Select
                value={form.unitId ? String(form.unitId) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, unitId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val) => labelForUnitValue(units, val) ?? undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Harga per satuan</Label>
                <Input
                  inputMode="decimal"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Stok (nilai absolut)</Label>
                <Input
                  inputMode="decimal"
                  value={form.quantityOnHand}
                  onChange={(e) => setForm((f) => ({ ...f, quantityOnHand: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!form.name.trim() || !form.unitId || patch.isPending}
              onClick={() => patch.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustRow} onOpenChange={(o) => !o && setAdjustRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Penyesuaian stok</DialogTitle>
            {adjustRow ? (
              <p className="text-sm text-muted-foreground">
                {adjustRow.name} — stok:{" "}
                <span className="font-semibold text-foreground">
                  {formatDecimalQty(adjustRow.quantityOnHand)}
                </span>
              </p>
            ) : null}
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Tambah / kurangi</Label>
            <Input
              inputMode="decimal"
              placeholder="10 atau -2.5"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Positif menambah stok; negatif mengurangi. Hasil tidak di bawah nol.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAdjustRow(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={
                adjust.isPending ||
                !adjustDelta.trim() ||
                Number(adjustDelta) === 0 ||
                Number.isNaN(Number(adjustDelta))
              }
              onClick={() => adjust.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus bahan baku?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {deleteRow?.name} ({deleteRow?.itemCode ?? "tanpa kode"}) akan dihapus permanen.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteRow(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteRow && remove.mutate(deleteRow.id)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
