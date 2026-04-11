"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, Package, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDate, formatIntegerQty } from "@/lib/format";

type StockRow = {
  id: string;
  itemName: string;
  productionDate: string;
  pickupDate: string | null;
  picName: string;
  batchCode: string | null;
  quantity: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  AVAILABLE: "Stock tersedia",
  OUT_OF_STOCK: "Stock habis",
};

const statusVariant: Record<string, "success" | "warning" | "destructive" | "outline"> = {
  AVAILABLE: "success",
  OUT_OF_STOCK: "destructive",
};

export default function StockPage() {
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustRow, setAdjustRow] = useState<StockRow | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [form, setForm] = useState({
    itemName: "",
    productionDate: today,
    pickupDate: "" as string | null,
    picName: "",
    batchCode: "",
    quantity: "1",
  });

  const list = useQuery({
    queryKey: ["stock", { from, to, search, page }],
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: StockRow[];
        meta: { page: number; limit: number; total: number };
      }>("/stock", {
        params: {
          page,
          limit: 10,
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/stock", {
        itemName: form.itemName,
        productionDate: form.productionDate,
        pickupDate: form.pickupDate || null,
        picName: form.picName,
        batchCode: form.batchCode || undefined,
        quantity: Number(form.quantity) || 0,
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Stok ditambahkan");
      setOpen(false);
      setForm({
        itemName: "",
        productionDate: today,
        pickupDate: null,
        picName: "",
        batchCode: "",
        quantity: "1",
      });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const adjustQty = useMutation({
    mutationFn: async () => {
      if (!adjustRow) return;
      const d = Number(adjustDelta);
      if (Number.isNaN(d) || d === 0) throw new Error("invalid");
      await api.patch(`/stock/${adjustRow.id}`, { quantityDelta: d });
    },
    onSuccess: () => {
      toast.success("Jumlah stok diperbarui");
      setAdjustOpen(false);
      setAdjustRow(null);
      setAdjustDelta("");
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: () => toast.error("Gagal menyesuaikan jumlah stok"),
  });

  const total = list.data?.meta.total ?? 0;
  const limit = list.data?.meta.limit ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppShell searchPlaceholder="Cari operasi, aset, atau batch…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Manajemen stok"
          description="Inventaris produksi dan pelacakan stok."
        >
          <Button variant="outline" type="button" className="border-indigo-200/80 bg-white/80" disabled>
            Ekspor ke Excel
          </Button>
          <Button type="button" className="btn-gradient border-0 shadow-indigo-500/25" onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Tambah stok
          </Button>
        </PageHeader>

        <div className="surface-panel flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Produksi dari</Label>
              <DateField value={from} onChange={setFrom} placeholder="Semua" />
            </div>
            <div className="space-y-2">
              <Label>Produksi sampai</Label>
              <DateField value={to} onChange={setTo} placeholder="Semua" />
            </div>
            <div className="space-y-2">
              <Label>Cari</Label>
              <Input
                placeholder="Nama / batch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFrom("");
                setTo("");
                setSearch("");
                setPage(1);
              }}
            >
              Hapus filter
            </Button>
            <Button type="button" className="btn-gradient border-0" onClick={() => setPage(1)}>
              Terapkan
            </Button>
          </div>
        </div>

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Produksi</TableHead>
                <TableHead>Pengambilan</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead className="text-right">Jml</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data?.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{row.itemName}</div>
                    {row.batchCode ? (
                      <div className="text-xs font-medium text-indigo-600/80 dark:text-indigo-300">
                        #{row.batchCode}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDate(row.productionDate)}</TableCell>
                  <TableCell>
                    {row.pickupDate ? formatDate(row.pickupDate) : "—"}
                  </TableCell>
                  <TableCell>{row.picName}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-indigo-800 dark:text-indigo-200">
                    {formatIntegerQty(row.quantity)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status] ?? "outline"}>
                      {statusLabel[row.status] ?? row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-indigo-200"
                      onClick={() => {
                        setAdjustRow(row);
                        setAdjustDelta("");
                        setAdjustOpen(true);
                      }}
                    >
                      <Package className="mr-1 size-3" />
                      Jumlah
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Belum ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-2 border-t border-indigo-100/80 bg-gradient-to-r from-indigo-50/50 to-violet-50/40 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:from-indigo-950/20 dark:to-violet-950/20 dark:text-slate-400">
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-slate-900 to-indigo-800 bg-clip-text text-lg font-bold text-transparent dark:from-white dark:to-indigo-200">
              Tambah item stok
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Catat barang masuk baru ke sistem manajemen stok.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nama item</Label>
              <Input
                placeholder="Contoh: Risol, kue kering"
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tanggal produksi</Label>
                <DateField
                  value={form.productionDate}
                  onChange={(v) => setForm((f) => ({ ...f, productionDate: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal pengambilan</Label>
                <DateField
                  value={form.pickupDate ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, pickupDate: v || null }))}
                  placeholder="Opsional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Penanggung jawab (PIC)</Label>
              <Input
                placeholder="Nama PIC, contoh: Budi Santoso"
                value={form.picName}
                onChange={(e) => setForm((f) => ({ ...f, picName: e.target.value }))}
                maxLength={255}
              />
              <p className="text-xs text-muted-foreground">
                Teks bebas (maks. 255 karakter) — disimpan sebagai nama PIC, tanpa wajib ke akun
                pengguna.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Batch / SKU (opsional)</Label>
              <Input
                value={form.batchCode}
                onChange={(e) => setForm((f) => ({ ...f, batchCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity awal</Label>
              <Input
                inputMode="decimal"
                placeholder="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Jumlah unit stok saat barang masuk. Nanti bisa disesuaikan atau berkurang lewat
                pengeluaran harian.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={
                create.isPending ||
                !form.itemName.trim() ||
                !form.picName.trim() ||
                Number(form.quantity) < 0
              }
              onClick={() => create.mutate()}
            >
              <CheckCheck className="mr-2 size-4" />
              Simpan stok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan jumlah stok</DialogTitle>
            {adjustRow ? (
              <p className="text-sm text-muted-foreground">
                {adjustRow.itemName} — stok saat ini:{" "}
                <span className="font-semibold text-foreground">
                  {formatIntegerQty(adjustRow.quantity)}
                </span>
              </p>
            ) : null}
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delta">Tambah / kurangi</Label>
            <Input
              id="delta"
              inputMode="decimal"
              placeholder="Contoh: 10 atau -5"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Gunakan angka positif untuk menambah, negatif untuk mengurangi. Hasil tidak akan di bawah
              0.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAdjustOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={
                adjustQty.isPending ||
                !adjustDelta.trim() ||
                Number(adjustDelta) === 0 ||
                Number.isNaN(Number(adjustDelta))
              }
              onClick={() => adjustQty.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
