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
import type { ApiListResponse, UnitRow } from "./types";

const MASTER_LIMIT = 100;

type Props = { isAdmin: boolean };

export function MasterUnitsTab({ isAdmin }: Props) {
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

  const [unitCreateOpen, setUnitCreateOpen] = useState(false);
  const [unitEdit, setUnitEdit] = useState<UnitRow | null>(null);
  const [unitDelete, setUnitDelete] = useState<UnitRow | null>(null);
  const [unitForm, setUnitForm] = useState({ code: "", name: "" });

  const invalidateMasters = () => {
    qc.invalidateQueries({ queryKey: ["master-units"] });
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

  return (
    <>
      <Card className="border-border bg-card shadow-md">
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
            className="border-primary/30"
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
    </>
  );
}
