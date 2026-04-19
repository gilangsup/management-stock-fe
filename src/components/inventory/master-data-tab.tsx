"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import type { ApiListResponse, SnackCategoryRow, UnitRow } from "./types";

const MASTER_LIMIT = 100;

type Props = { isAdmin: boolean };

export function MasterDataTab({ isAdmin }: Props) {
  const qc = useQueryClient();

  const units = useQuery({
    queryKey: ["master-units", "list"],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<UnitRow>>("/master/units", {
        params: { page: 1, limit: MASTER_LIMIT },
      });
      return data;
    },
    staleTime: 60_000,
  });

  const categories = useQuery({
    queryKey: ["master-snack-categories", "list"],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<SnackCategoryRow>>("/master/snack-categories", {
        params: { page: 1, limit: MASTER_LIMIT },
      });
      return data;
    },
    staleTime: 60_000,
  });

  const [unitCreateOpen, setUnitCreateOpen] = useState(false);
  const [unitEdit, setUnitEdit] = useState<UnitRow | null>(null);
  const [unitDelete, setUnitDelete] = useState<UnitRow | null>(null);
  const [unitForm, setUnitForm] = useState({ code: "", name: "" });

  const [catCreateOpen, setCatCreateOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<SnackCategoryRow | null>(null);
  const [catDelete, setCatDelete] = useState<SnackCategoryRow | null>(null);
  const [catForm, setCatForm] = useState({ name: "", codePrefix: "" });

  const invalidateMasters = () => {
    qc.invalidateQueries({ queryKey: ["master-units"] });
    qc.invalidateQueries({ queryKey: ["master-snack-categories"] });
    qc.invalidateQueries({ queryKey: ["raw-materials"] });
    qc.invalidateQueries({ queryKey: ["finished-products"] });
  };

  const createUnit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: UnitRow }>("/master/units", {
        code: unitForm.code.trim(),
        name: unitForm.name.trim(),
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Satuan ditambahkan");
      setUnitCreateOpen(false);
      setUnitForm({ code: "", name: "" });
      invalidateMasters();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan satuan")),
  });

  const patchUnit = useMutation({
    mutationFn: async () => {
      if (!unitEdit) return;
      await api.patch(`/master/units/${unitEdit.id}`, {
        code: unitForm.code.trim(),
        name: unitForm.name.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Satuan diperbarui");
      setUnitEdit(null);
      invalidateMasters();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal memperbarui satuan")),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => api.delete(`/master/units/${id}`),
    onSuccess: () => {
      toast.success("Satuan dihapus");
      setUnitDelete(null);
      invalidateMasters();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus satuan")),
  });

  const createCat = useMutation({
    mutationFn: async () => {
      const body: { name: string; codePrefix?: string } = { name: catForm.name.trim() };
      const p = catForm.codePrefix.trim();
      if (p) body.codePrefix = p;
      const { data } = await api.post<{ data: SnackCategoryRow }>(
        "/master/snack-categories",
        body,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Kategori ditambahkan");
      setCatCreateOpen(false);
      setCatForm({ name: "", codePrefix: "" });
      invalidateMasters();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan kategori")),
  });

  const patchCat = useMutation({
    mutationFn: async () => {
      if (!catEdit) return;
      const body: { name?: string; codePrefix?: string } = {
        name: catForm.name.trim(),
      };
      if (catForm.codePrefix.trim()) body.codePrefix = catForm.codePrefix.trim();
      await api.patch(`/master/snack-categories/${catEdit.id}`, body);
    },
    onSuccess: () => {
      toast.success("Kategori diperbarui");
      setCatEdit(null);
      invalidateMasters();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal memperbarui kategori")),
  });

  const deleteCat = useMutation({
    mutationFn: async (id: string) => api.delete(`/master/snack-categories/${id}`),
    onSuccess: () => {
      toast.success("Kategori dihapus");
      setCatDelete(null);
      invalidateMasters();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus kategori")),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-emerald-100/80 bg-white/90 shadow-md dark:border-emerald-900/40 dark:bg-slate-900/60">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Master satuan</CardTitle>
            <CardDescription>
              Kode unik (lowercase), dipakai di bahan baku. Contoh: kg, pcs, pax.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-emerald-200"
            onClick={() => {
              setUnitForm({ code: "", name: "" });
              setUnitCreateOpen(true);
            }}
          >
            <Plus className="mr-1 size-3.5" />
            Satuan
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(units.data?.data ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-sm">{u.code}</TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setUnitForm({ code: u.code, name: u.name });
                          setUnitEdit(u);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          onClick={() => setUnitDelete(u)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!units.data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    {units.isLoading ? "Memuat…" : "Belum ada satuan."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-violet-100/80 bg-white/90 shadow-md dark:border-violet-900/40 dark:bg-slate-900/60">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-lg">Kategori snack</CardTitle>
            <CardDescription>
              Prefix kode dipakai untuk penomoran barang jadi (mis. SM001). Kosongkan prefix saat
              buat agar sistem hitung dari nama.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-violet-200"
            onClick={() => {
              setCatForm({ name: "", codePrefix: "" });
              setCatCreateOpen(true);
            }}
          >
            <Plus className="mr-1 size-3.5" />
            Kategori
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categories.data?.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm text-violet-700 dark:text-violet-300">
                    {c.codePrefix}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setCatForm({ name: c.name, codePrefix: c.codePrefix });
                          setCatEdit(c);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                          onClick={() => setCatDelete(c)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!categories.data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                    {categories.isLoading ? "Memuat…" : "Belum ada kategori."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={unitCreateOpen} onOpenChange={setUnitCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Satuan baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input
                placeholder="kg"
                value={unitForm.code}
                onChange={(e) => setUnitForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama tampilan</Label>
              <Input
                placeholder="Kilogram"
                value={unitForm.name}
                onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setUnitCreateOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={
                !unitForm.code.trim() || !unitForm.name.trim() || createUnit.isPending
              }
              onClick={() => createUnit.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unitEdit} onOpenChange={(o) => !o && setUnitEdit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah satuan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input
                value={unitForm.code}
                onChange={(e) => setUnitForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setUnitEdit(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!unitForm.code.trim() || !unitForm.name.trim() || patchUnit.isPending}
              onClick={() => patchUnit.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!unitDelete} onOpenChange={(o) => !o && setUnitDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus satuan?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {unitDelete?.name} ({unitDelete?.code}) — hanya bisa jika tidak dipakai bahan baku.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setUnitDelete(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteUnit.isPending}
              onClick={() => unitDelete && deleteUnit.mutate(unitDelete.id)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catCreateOpen} onOpenChange={setCatCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategori baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Nama kategori</Label>
              <Input
                placeholder="Snack Manis"
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prefix kode (opsional)</Label>
              <Input
                placeholder="Biarkan kosong untuk otomatis"
                value={catForm.codePrefix}
                onChange={(e) => setCatForm((f) => ({ ...f, codePrefix: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCatCreateOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!catForm.name.trim() || createCat.isPending}
              onClick={() => createCat.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!catEdit} onOpenChange={(o) => !o && setCatEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah kategori</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Mengubah prefix tidak mengubah kode barang jadi yang sudah ada.
            </p>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Prefix kode</Label>
              <Input
                value={catForm.codePrefix}
                onChange={(e) => setCatForm((f) => ({ ...f, codePrefix: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCatEdit(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!catForm.name.trim() || patchCat.isPending}
              onClick={() => patchCat.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!catDelete} onOpenChange={(o) => !o && setCatDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus kategori?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {catDelete?.name} — gagal jika masih ada barang jadi di kategori ini.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCatDelete(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteCat.isPending}
              onClick={() => catDelete && deleteCat.mutate(catDelete.id)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
