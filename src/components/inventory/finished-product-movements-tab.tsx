"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/format";
import type {
  ApiListResponse,
  FinishedProductMovementRow,
  FinishedProductRow,
} from "./types";

const PAGE_SIZE = 20;

type MovementForm = {
  finishedProductId: string;
  direction: "masuk" | "keluar";
  qty: string;
  picName: string;
  eventDate: string;
  notes: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): MovementForm {
  return {
    finishedProductId: "",
    direction: "masuk",
    qty: "",
    picName: "",
    eventDate: todayIso(),
    notes: "",
  };
}

function formatTimestamp(ts: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }) + ", " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function FinishedProductMovementsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [fpFilter, setFpFilter] = useState("");
  const [dirFilter, setDirFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<FinishedProductMovementRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<FinishedProductMovementRow | null>(null);
  const [form, setForm] = useState<MovementForm>(emptyForm());

  // Daftar barang jadi untuk combobox
  const fpList = useQuery({
    queryKey: ["finished-products", { page: 1, limit: 200 }],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<FinishedProductRow>>("/finished-products", {
        params: { page: 1, limit: 200 },
      });
      return data;
    },
    staleTime: 60_000,
  });

  const finishedProducts = fpList.data?.data ?? [];

  const list = useQuery({
    queryKey: [
      "fp-movements",
      { page, fpFilter, dirFilter, fromDate, toDate, search },
    ],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<FinishedProductMovementRow>>(
        "/finished-product-movements",
        {
          params: {
            page,
            limit: PAGE_SIZE,
            ...(fpFilter ? { finishedProductId: fpFilter } : {}),
            ...(dirFilter ? { direction: dirFilter } : {}),
            ...(fromDate ? { from: fromDate } : {}),
            ...(toDate ? { to: toDate } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        },
      );
      return data;
    },
  });

  const total = list.data?.meta.total ?? 0;
  const limit = list.data?.meta.limit ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ success: boolean; data: FinishedProductMovementRow }>(
        "/finished-product-movements",
        {
          finishedProductId: form.finishedProductId,
          direction: form.direction,
          qty: Number(form.qty),
          picName: form.picName.trim(),
          eventDate: form.eventDate,
          notes: form.notes.trim() || null,
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Riwayat stok ditambahkan");
      setCreateOpen(false);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ["fp-movements"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menyimpan")),
  });

  const patch = useMutation({
    mutationFn: async () => {
      if (!editRow) return;
      const { data } = await api.patch<{ success: boolean; data: FinishedProductMovementRow }>(
        `/finished-product-movements/${editRow.id}`,
        {
          direction: form.direction,
          qty: Number(form.qty),
          picName: form.picName.trim(),
          eventDate: form.eventDate,
          notes: form.notes.trim() || null,
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Riwayat stok diperbarui");
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ["fp-movements"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal memperbarui")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finished-product-movements/${id}`);
    },
    onSuccess: () => {
      toast.success("Riwayat stok dihapus");
      setDeleteRow(null);
      qc.invalidateQueries({ queryKey: ["fp-movements"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus")),
  });

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      finishedProductId: fpFilter || (finishedProducts[0]?.id ?? ""),
    });
    setCreateOpen(true);
  };

  const openEdit = (row: FinishedProductMovementRow) => {
    setForm({
      finishedProductId: row.finishedProductId,
      direction: row.direction,
      qty: String(row.qty),
      picName: row.picName,
      eventDate: row.eventDate,
      notes: row.notes ?? "",
    });
    setEditRow(row);
  };

  const canSubmitCreate =
    form.finishedProductId &&
    form.qty &&
    Number(form.qty) > 0 &&
    form.picName.trim() &&
    form.eventDate &&
    !create.isPending;

  const canSubmitEdit =
    form.qty &&
    Number(form.qty) > 0 &&
    form.picName.trim() &&
    form.eventDate &&
    !patch.isPending;

  const filterBar = useMemo(
    () => (
      <div className="surface-panel flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Barang jadi</Label>
            <Select
              value={fpFilter || "__all__"}
              onValueChange={(v) => {
                setFpFilter(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Semua barang">
                  {(val) =>
                    val === "__all__"
                      ? "Semua barang"
                      : (finishedProducts.find((f) => f.id === val)?.name ?? val)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua barang</SelectItem>
                {finishedProducts.map((fp) => (
                  <SelectItem key={fp.id} value={fp.id}>
                    {fp.name} ({fp.itemCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Arah</Label>
            <Select
              value={dirFilter || "__all__"}
              onValueChange={(v) => {
                setDirFilter(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Semua arah">
                  {(val) =>
                    val === "__all__" ? "Semua arah" : val === "masuk" ? "Masuk" : "Keluar"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua arah</SelectItem>
                <SelectItem value="masuk">Masuk</SelectItem>
                <SelectItem value="keluar">Keluar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dari tanggal</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Sampai tanggal</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setFpFilter("");
              setDirFilter("");
              setFromDate("");
              setToDate("");
              setSearch("");
              setPage(1);
            }}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-primary/30 bg-primary/5"
            disabled={fpList.isLoading}
            onClick={openCreate}
          >
            <Plus className="mr-2 size-4" />
            Tambah
          </Button>
        </div>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fpFilter, dirFilter, fromDate, toDate, search, finishedProducts, fpList.isLoading],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Setiap baris mencatat satu kejadian masuk atau keluar stok.{" "}
        <strong className="font-medium text-foreground">Stok SKU</strong> menampilkan{" "}
        saldo kumulatif setelah kejadian tersebut — bukan nilai master saat ini.
      </p>

      {filterBar}

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal kejadian</TableHead>
              <TableHead>Arah</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead className="text-right">QTY</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Dicatat</TableHead>
              <TableHead className="text-right">
                Stok SKU
                <span className="ml-0.5 align-super text-[10px] text-muted-foreground">*</span>
              </TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" />
                    {formatDate(row.eventDate)}
                  </span>
                </TableCell>
                <TableCell>
                  {row.direction === "masuk" ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    >
                      <ArrowUp className="mr-1 size-3" />
                      Masuk
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    >
                      <ArrowDown className="mr-1 size-3" />
                      Keluar
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {row.productName ?? "—"}
                  </div>
                  {row.itemCode ? (
                    <div className="font-mono text-xs text-muted-foreground">{row.itemCode}</div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {row.qty.toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-sm">{row.picName}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(row.createdAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-primary">
                  {row.stockAfter !== null
                    ? row.stockAfter.toLocaleString("id-ID")
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteRow(row)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!list.data?.data?.length && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {list.isLoading ? "Memuat…" : "Belum ada riwayat stok."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 text-muted-foreground">
            <p>
              Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1}–
              {Math.min(page * limit, total)} dari {total}
            </p>
            <p className="text-[11px]">
              *Stok SKU = saldo kumulatif setelah kejadian (bukan nilai master saat ini).
              Mengubah atau menghapus riwayat akan mengubah saldo di baris berikutnya.
            </p>
          </div>
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

      {/* Dialog Tambah */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah riwayat stok</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Stok SKU dihitung otomatis sebagai saldo kumulatif setelah kejadian ini.
            </p>
          </DialogHeader>
          <MovementFormFields
            form={form}
            setForm={setForm}
            finishedProducts={finishedProducts}
            showProductSelect
          />
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

      {/* Dialog Edit */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah riwayat stok</DialogTitle>
            {editRow ? (
              <p className="text-sm text-muted-foreground">
                {editRow.productName} ({editRow.itemCode})
              </p>
            ) : null}
          </DialogHeader>
          <MovementFormFields
            form={form}
            setForm={setForm}
            finishedProducts={finishedProducts}
            showProductSelect={false}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditRow(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!canSubmitEdit}
              onClick={() => patch.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <Dialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus riwayat stok?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Kejadian{" "}
              <strong>
                {deleteRow?.direction === "masuk" ? "Masuk" : "Keluar"} {deleteRow?.qty} pcs
              </strong>{" "}
              pada {deleteRow ? formatDate(deleteRow.eventDate) : "—"} akan dihapus. Saldo stok
              kumulatif riwayat berikutnya akan otomatis menyesuaikan.
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

type FormFieldsProps = {
  form: MovementForm;
  setForm: React.Dispatch<React.SetStateAction<MovementForm>>;
  finishedProducts: FinishedProductRow[];
  showProductSelect: boolean;
};

function MovementFormFields({
  form,
  setForm,
  finishedProducts,
  showProductSelect,
}: FormFieldsProps) {
  return (
    <div className="grid gap-4 py-2">
      {showProductSelect ? (
        <div className="space-y-2">
          <Label>Barang jadi</Label>
          <Select
            value={form.finishedProductId || undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, finishedProductId: v ?? "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih barang jadi">
                {(val) => {
                  const fp = finishedProducts.find((f) => f.id === val);
                  return fp ? `${fp.name} (${fp.itemCode})` : undefined;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {finishedProducts.map((fp) => (
                <SelectItem key={fp.id} value={fp.id}>
                  {fp.name} ({fp.itemCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Arah</Label>
        <Select
          value={form.direction}
          onValueChange={(v: "masuk" | "keluar") => setForm((f) => ({ ...f, direction: v }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(val) => (val === "masuk" ? "Masuk (stok bertambah)" : "Keluar (stok berkurang)")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="masuk">Masuk (stok bertambah)</SelectItem>
            <SelectItem value="keluar">Keluar (stok berkurang)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>QTY</Label>
          <Input
            inputMode="numeric"
            placeholder="0"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Tanggal kejadian</Label>
          <Input
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>PIC</Label>
        <Input
          placeholder="Nama penanggung jawab"
          value={form.picName}
          onChange={(e) => setForm((f) => ({ ...f, picName: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Catatan <span className="text-muted-foreground">(opsional)</span>
        </Label>
        <Input
          placeholder="Keterangan tambahan…"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
    </div>
  );
}
