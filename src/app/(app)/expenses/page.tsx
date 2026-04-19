"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
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
import { api } from "@/lib/api";
import { formatDate, formatIdr, formatIntegerQty } from "@/lib/format";
import { cn } from "@/lib/utils";

type Range = "today" | "week" | "month";
type ExpenseSource = "stock" | "purchase";

type ExpenseRow = {
  id: string;
  expenseDate: string;
  itemName: string;
  stockItemId: string | null;
  usageNote: string | null;
  qty: string;
  unitPrice: string;
  totalPrice: string;
};

type StockPickerRow = {
  id: string;
  itemName: string;
  quantity: string;
  productionDate: string;
  batchCode: string | null;
};

export default function ExpensesPage() {
  const qc = useQueryClient();
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [range, setRange] = useState<Range>("today");
  const [date, setDate] = useState(anchor);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<ExpenseSource>("stock");
  const [form, setForm] = useState({
    stockItemId: "",
    usageNote: "",
    itemName: "",
    qty: "1",
    unitPrice: "",
    expenseDate: anchor,
  });

  const stockPicker = useQuery({
    queryKey: ["stock", "picker"],
    queryFn: async () => {
      const { data } = await api.get<{
        data: StockPickerRow[];
        meta: { total: number };
      }>("/stock", { params: { page: 1, limit: 100 } });
      return data;
    },
    enabled: open && source === "stock",
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!open || source !== "stock") return;
    void qc.invalidateQueries({ queryKey: ["stock", "picker"] });
  }, [open, source, qc]);

  const selectedStock = useMemo(
    () => (stockPicker.data?.data ?? []).find((s) => s.id === form.stockItemId),
    [stockPicker.data?.data, form.stockItemId],
  );

  const summary = useQuery({
    queryKey: ["expenses-summary", range, date],
    queryFn: async () => {
      const { data } = await api.get<{
        data: {
          totalItemsPurchased: string;
          totalExpenses: string;
          from: string;
          to: string;
        };
      }>("/expenses/summary", { params: { range, date } });
      return data;
    },
  });

  const list = useQuery({
    queryKey: ["expenses", range, date],
    queryFn: async () => {
      const { data } = await api.get<{
        data: ExpenseRow[];
        meta: {
          summary: { totalExpenditure: string; totalQty: string; lineCount: number };
        };
      }>("/expenses", { params: { range, date, limit: 100 } });
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const base = {
        qty: Number(form.qty),
        unitPrice: Number(form.unitPrice),
        expenseDate: form.expenseDate,
      };
      if (source === "stock") {
        const { data } = await api.post("/expenses", {
          ...base,
          stockItemId: form.stockItemId,
          usageNote: form.usageNote.trim(),
        });
        return data;
      }
      const { data } = await api.post("/expenses", {
        ...base,
        itemName: form.itemName.trim(),
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Pengeluaran ditambahkan");
      setOpen(false);
      setSource("stock");
      setForm({
        stockItemId: "",
        usageNote: "",
        itemName: "",
        qty: "1",
        unitPrice: "",
        expenseDate: date,
      });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (err: unknown) => {
      if (isAxiosError(err)) {
        const d = err.response?.data as { error?: string } | undefined;
        if (d?.error) {
          toast.error(d.error);
          return;
        }
      }
      toast.error("Gagal menyimpan");
    },
  });

  const metaSum = list.data?.meta.summary;

  const canSubmitStock =
    form.stockItemId &&
    form.usageNote.trim().length > 0 &&
    Number(form.qty) > 0 &&
    Number(form.unitPrice) >= 0;

  const canSubmitPurchase =
    form.itemName.trim().length > 0 &&
    Number(form.qty) > 0 &&
    Number(form.unitPrice) >= 0;

  return (
    <AppShell searchPlaceholder="Cari pengeluaran…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Pengeluaran harian"
          description="Catat dan pantau pengeluaran operasional secara real time."
        >
          <DateField value={date} onChange={setDate} />
          <Button
            type="button"
            className="btn-gradient border-0"
            onClick={() => {
              setForm((f) => ({ ...f, expenseDate: date }));
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Tambah pengeluaran
          </Button>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Total item (jumlah)"
            icon={ShoppingCart}
            tone="emerald"
            footer="Periode filter aktif"
          >
            {summary.data
              ? formatIntegerQty(summary.data.data.totalItemsPurchased)
              : "—"}
          </StatCard>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-violet-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/30 ring-1 ring-white/20">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Total pengeluaran</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold tabular-nums tracking-tight">
                {summary.data ? formatIdr(summary.data.data.totalExpenses) : "—"}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white/95">
                Dalam anggaran
              </p>
              <p className="mt-2 text-xs text-white/70">Terakhir diperbarui: sekarang</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as Range)} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="pill">
              <TabsTrigger value="today">Hari ini</TabsTrigger>
              <TabsTrigger value="week">Mingguan</TabsTrigger>
              <TabsTrigger value="month">Bulanan</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-indigo-200/80 bg-white/80"
                disabled
              >
                Saring
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-indigo-200/80 bg-white/80"
                disabled
              >
                Ekspor CSV
              </Button>
            </div>
          </div>
        </Tabs>

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jml</TableHead>
                <TableHead className="text-right">Satuan</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data?.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                    {row.itemName}
                    {row.stockItemId ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        Dari stok
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm text-slate-600 dark:text-slate-300">
                    {row.usageNote ? (
                      <span className="line-clamp-3 whitespace-pre-wrap">{row.usageNote}</span>
                    ) : (
                      <span className="text-muted-foreground">Pembelian / di luar stok</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatIntegerQty(row.qty)}</TableCell>
                  <TableCell className="text-right">{formatIdr(row.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold text-indigo-700 dark:text-indigo-300">
                    {formatIdr(row.totalPrice)}
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Belum ada pengeluaran di periode ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-1 border-t border-indigo-100/80 bg-gradient-to-r from-emerald-50/40 via-white to-violet-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-violet-950/20">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Total pengeluaran harian:{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
                {metaSum ? formatIdr(metaSum.totalExpenditure) : formatIdr(0)}
              </span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {metaSum?.lineCount ?? 0} baris · qty kumulatif{" "}
              {formatIntegerQty(metaSum?.totalQty ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSource("stock");
            setForm({
              stockItemId: "",
              usageNote: "",
              itemName: "",
              qty: "1",
              unitPrice: "",
              expenseDate: date,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah pengeluaran</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pakai stok akan mengurangi jumlah di halaman stok. Keterangan penggunaan wajib diisi.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex rounded-lg bg-muted/80 p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  source === "stock"
                    ? "bg-white text-indigo-900 shadow-sm dark:bg-slate-800 dark:text-indigo-100"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setSource("stock");
                  setForm((f) => ({ ...f, itemName: "" }));
                }}
              >
                Pakai stok
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  source === "purchase"
                    ? "bg-white text-indigo-900 shadow-sm dark:bg-slate-800 dark:text-indigo-100"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setSource("purchase");
                  setForm((f) => ({ ...f, stockItemId: "", usageNote: "" }));
                }}
              >
                Pembelian
              </button>
            </div>

            <div className="space-y-2">
              <Label>Tanggal</Label>
              <DateField
                value={form.expenseDate}
                onChange={(v) => setForm((f) => ({ ...f, expenseDate: v }))}
              />
            </div>

            {source === "stock" ? (
              <>
                <div className="space-y-2">
                  <Label>Barang dari stok</Label>
                  <p className="text-xs text-muted-foreground">
                    Nama bisa sama antar batch; pilih baris yang sesuai (lihat tanggal produksi / batch).
                  </p>
                  {stockPicker.isLoading ? (
                    <p className="text-xs text-muted-foreground">Memuat daftar stok…</p>
                  ) : null}
                  {!stockPicker.isLoading && (stockPicker.data?.data?.length ?? 0) === 0 ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Belum ada barang di stok. Tambahkan di manajemen stok atau gunakan mode
                      pembelian.
                    </p>
                  ) : null}
                  <div
                    role="radiogroup"
                    aria-label="Pilih baris stok"
                    className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-input bg-muted/30 p-2"
                  >
                    {(stockPicker.data?.data ?? []).map((s) => {
                      const sid = `stock-pick-${s.id}`;
                      const batch = s.batchCode?.trim();
                      return (
                        <label
                          key={s.id}
                          htmlFor={sid}
                          className={cn(
                            "flex cursor-pointer gap-3 rounded-md border bg-background p-3 text-sm shadow-xs transition-colors",
                            form.stockItemId === s.id
                              ? "border-indigo-400 ring-2 ring-indigo-400/30"
                              : "border-transparent hover:border-indigo-200/80",
                          )}
                        >
                          <input
                            id={sid}
                            type="radio"
                            name="expense-stock-item"
                            className="mt-1 size-4 accent-indigo-600"
                            checked={form.stockItemId === s.id}
                            onChange={() => setForm((f) => ({ ...f, stockItemId: s.id }))}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-semibold text-foreground">{s.itemName}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              Produksi {formatDate(s.productionDate)}
                              {batch ? ` · batch ${batch}` : ""}
                            </span>
                            <span className="mt-1 block text-xs font-medium text-indigo-800 dark:text-indigo-200">
                              Tersisa: {formatIntegerQty(s.quantity)} unit
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {selectedStock ? (
                    <p className="rounded-md bg-indigo-50/80 px-2 py-1.5 text-xs text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100">
                      Akan mengurangi stok{" "}
                      <strong>{selectedStock.itemName}</strong>
                      {selectedStock.batchCode?.trim()
                        ? ` (batch ${selectedStock.batchCode.trim()})`
                        : ""}{" "}
                      (sisa saat ini {formatIntegerQty(selectedStock.quantity)} unit).
                    </p>
                  ) : form.stockItemId ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Baris yang dipilih tidak ada di daftar terbaru. Tutup dialog dan buka lagi, lalu
                      pilih ulang.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage-note">Keterangan penggunaan (wajib)</Label>
                  <textarea
                    id="usage-note"
                    rows={3}
                    placeholder="Contoh: dipakai untuk catering acara X, rusak saat penyimpanan, dll."
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.usageNote}
                    onChange={(e) => setForm((f) => ({ ...f, usageNote: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Nama item</Label>
                <Input
                  value={form.itemName}
                  onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                  placeholder="Belanja di luar sistem stok"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input
                  inputMode="decimal"
                  value={form.qty}
                  onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Harga satuan</Label>
                <Input
                  inputMode="decimal"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="0 untuk pemakaian internal"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={
                create.isPending ||
                (source === "stock" ? !canSubmitStock : !canSubmitPurchase) ||
                Number.isNaN(Number(form.qty)) ||
                Number.isNaN(Number(form.unitPrice))
              }
              onClick={() => create.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
