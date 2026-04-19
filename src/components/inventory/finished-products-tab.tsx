"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { formatIdr } from "@/lib/format";
import { labelForSnackCategoryValue } from "@/lib/select-labels";
import type { ApiListResponse, FinishedProductRow, SnackCategoryRow } from "./types";

const PAGE_SIZE = 15;

type Props = {
  isAdmin: boolean;
  categories: SnackCategoryRow[] | undefined;
  categoriesLoading: boolean;
};

export function FinishedProductsTab({ isAdmin, categories, categoriesLoading }: Props) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<FinishedProductRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<FinishedProductRow | null>(null);

  const [form, setForm] = useState({
    name: "",
    snackCategoryId: "",
    costPrice: "0",
  });

  const list = useQuery({
    queryKey: ["finished-products", { page, search, categoryFilter }],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<FinishedProductRow>>("/finished-products", {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(categoryFilter ? { categoryId: categoryFilter } : {}),
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
      const { data } = await api.post<{ success: boolean; data: FinishedProductRow }>(
        "/finished-products",
        {
          name: form.name.trim(),
          snackCategoryId: form.snackCategoryId,
          costPrice: Number(form.costPrice) || 0,
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Barang jadi ditambahkan");
      setCreateOpen(false);
      setForm({ name: "", snackCategoryId: "", costPrice: "0" });
      qc.invalidateQueries({ queryKey: ["finished-products"] });
      qc.invalidateQueries({ queryKey: ["dash-inventory"] });
      qc.invalidateQueries({ queryKey: ["hotel-sell-prices"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan")),
  });

  const patch = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const { data } = await api.patch<{ success: boolean; data: FinishedProductRow }>(
        `/finished-products/${editRow.id}`,
        {
          name: form.name.trim(),
          snackCategoryId: form.snackCategoryId || undefined,
          costPrice: Number(form.costPrice),
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Barang jadi diperbarui");
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ["finished-products"] });
      qc.invalidateQueries({ queryKey: ["hotel-sell-prices"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal memperbarui")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finished-products/${id}`);
    },
    onSuccess: () => {
      toast.success("Barang jadi dihapus");
      setDeleteRow(null);
      qc.invalidateQueries({ queryKey: ["finished-products"] });
      qc.invalidateQueries({ queryKey: ["dash-inventory"] });
      qc.invalidateQueries({ queryKey: ["hotel-sell-prices"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus")),
  });

  const openEdit = (row: FinishedProductRow) => {
    setForm({
      name: row.name,
      snackCategoryId: row.snackCategory.id,
      costPrice: String(Number(row.costPrice)),
    });
    setEditRow(row);
  };

  const firstCatId = categories?.[0]?.id ?? "";
  const canSubmitCreate =
    form.name.trim() &&
    form.snackCategoryId &&
    !create.isPending &&
    !categoriesLoading &&
    !!categories?.length;

  const filterBar = useMemo(
    () => (
      <div className="surface-panel flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Cari nama / kode</Label>
            <Input
              placeholder="Risol, SM001…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Filter kategori</Label>
            <Select
              value={categoryFilter ? String(categoryFilter) : "__all__"}
              onValueChange={(v) => setCategoryFilter(v === "__all__" ? "" : (v ?? ""))}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Semua kategori">
                  {(val) =>
                    val === "__all__"
                      ? "Semua kategori"
                      : (labelForSnackCategoryValue(categories, val, { withPrefix: false }) ??
                        undefined)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua kategori</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
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
              setCategoryFilter("");
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
            className="border-primary/30 bg-primary/5"
            disabled={!categories?.length}
            onClick={() => {
              setForm({
                name: "",
                snackCategoryId: firstCatId,
                costPrice: "0",
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
    [search, categoryFilter, categories, firstCatId],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Master ini hanya <strong className="font-medium text-foreground">harga pokok</strong> (modal).
        Harga jual per hotel diatur di tab <strong className="font-medium text-foreground">Harga hotel</strong>{" "}
        agar bon/faktur bisa mengisi nominal otomatis per hotel.
      </p>
      {filterBar}

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga pokok</TableHead>
              <TableHead className="w-[140px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-sm font-medium text-primary">
                  {row.itemCode}
                </TableCell>
                <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                  {row.name}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{row.snackCategory.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Prefix {row.snackCategory.codePrefix}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatIdr(row.costPrice)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1">
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
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {list.isLoading ? "Memuat…" : "Belum ada barang jadi."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Barang jadi baru</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Kode barang dibentuk dari prefix kategori + urut 3 digit. Harga jual mengikuti master
              per hotel (tab Harga hotel).
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Risol, kue kering…"
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori snack</Label>
              <Select
                value={form.snackCategoryId ? String(form.snackCategoryId) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, snackCategoryId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori">
                    {(val) => labelForSnackCategoryValue(categories, val) ?? undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.codePrefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Harga pokok (Rp)</Label>
              <Input
                inputMode="decimal"
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
              />
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
            <DialogTitle>Ubah barang jadi</DialogTitle>
            {editRow ? (
              <p className="text-sm text-muted-foreground">
                Kode saat ini:{" "}
                <span className="font-mono font-semibold text-foreground">{editRow.itemCode}</span>.
                Mengganti kategori akan mengalokasikan urut baru dan mengganti kode. Harga jual per
                hotel tidak diubah di sini.
              </p>
            ) : null}
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
              <Label>Kategori snack</Label>
              <Select
                value={form.snackCategoryId ? String(form.snackCategoryId) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, snackCategoryId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(val) => labelForSnackCategoryValue(categories, val) ?? undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.codePrefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Harga pokok</Label>
              <Input
                inputMode="decimal"
                value={form.costPrice}
                onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
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
              disabled={!form.name.trim() || !form.snackCategoryId || patch.isPending}
              onClick={() => patch.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus barang jadi?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {deleteRow?.name} ({deleteRow?.itemCode}) akan dihapus permanen. Harga jual hotel
              terkait ikut terhapus di server.
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
