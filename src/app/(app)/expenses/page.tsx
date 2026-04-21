"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, ShoppingCart, Trash2 } from "lucide-react";
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
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredUser } from "@/lib/auth-storage";
import { formatDate, formatDecimalQty, formatIdr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiListResponse, RawMaterialRow } from "@/components/inventory/types";

type Range = "today" | "week" | "month";

type ExpenseRow = {
  id: string;
  expenseDate: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  notes?: string | null;
  rawMaterial: {
    id: string;
    name: string;
    itemCode: string | null;
    unit: { id: string; code: string; name: string };
  };
};

/** Hasil pencarian dari server (`search`); bukan memuat semua lalu filter di klien. */
const RAW_MATERIAL_PICKER_PAGE_LIMIT = 50;

export default function ExpensesPage() {
  const qc = useQueryClient();
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [range, setRange] = useState<Range>("today");
  const [date, setDate] = useState(anchor);
  const [open, setOpen] = useState(false);
  const [rmPickerOpen, setRmPickerOpen] = useState(false);
  const [rmSearchInput, setRmSearchInput] = useState("");
  const [debouncedRmSearch, setDebouncedRmSearch] = useState("");
  const [pickedRm, setPickedRm] = useState<RawMaterialRow | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRow | null>(null);
  const [form, setForm] = useState({
    rawMaterialId: "",
    qty: "1",
    unitPrice: "",
    totalPrice: "",
    notes: "",
    expenseDate: anchor,
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedRmSearch(rmSearchInput), 250);
    return () => window.clearTimeout(t);
  }, [rmSearchInput]);

  const rawMaterialsPicker = useQuery({
    queryKey: ["raw-materials", "picker", debouncedRmSearch],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<RawMaterialRow>>("/raw-materials", {
        params: {
          page: 1,
          limit: RAW_MATERIAL_PICKER_PAGE_LIMIT,
          ...(debouncedRmSearch.trim() ? { search: debouncedRmSearch.trim() } : {}),
        },
      });
      return data;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const summary = useQuery({
    queryKey: ["expenses-summary", range, date],
    queryFn: async () => {
      const { data } = await api.get<{
        data: {
          totalExpenses: string;
          totalQty: string;
          from: string;
          to: string;
          dailyBreakdown?: {
            date: string;
            lineCount: number;
            totalQty: string;
            totalExpenses: string;
          }[];
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
      }>("/expenses", { params: { range, date, limit: 500 } });
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const base: Record<string, unknown> = {
        expenseDate: form.expenseDate,
        rawMaterialId: form.rawMaterialId,
        qty: Number(form.qty),
        unitPrice: Number(form.unitPrice),
      };
      if (form.notes.trim()) base.notes = form.notes.trim();
      const tp = form.totalPrice.trim();
      if (tp !== "") {
        const n = Number(tp);
        if (Number.isFinite(n)) base.totalPrice = n;
      }
      const { data } = await api.post("/expenses", base);
      return data;
    },
    onSuccess: () => {
      toast.success("Pembelian tercatat");
      setOpen(false);
      setForm({
        rawMaterialId: "",
        qty: "1",
        unitPrice: "",
        totalPrice: "",
        notes: "",
        expenseDate: date,
      });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      qc.invalidateQueries({ queryKey: ["expense-summary-dash"] });
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

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      toast.success("Pembelian dihapus");
      setExpenseToDelete(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      qc.invalidateQueries({ queryKey: ["expense-summary-dash"] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, "Gagal menghapus")),
  });

  const metaSum = list.data?.meta.summary;

  const computedLineTotal = useMemo(() => {
    const q = Number(form.qty);
    const u = Number(form.unitPrice);
    if (!Number.isFinite(q) || !Number.isFinite(u)) return null;
    return q * u;
  }, [form.qty, form.unitPrice]);

  const canSubmit =
    form.rawMaterialId &&
    Number(form.qty) > 0 &&
    Number(form.unitPrice) >= 0 &&
    !Number.isNaN(Number(form.qty)) &&
    !Number.isNaN(Number(form.unitPrice));

  const rmList = rawMaterialsPicker.data?.data ?? [];
  const rmMetaTotal = rawMaterialsPicker.data?.meta.total;
  const selectedRm =
    pickedRm && pickedRm.id === form.rawMaterialId
      ? pickedRm
      : (rmList.find((r) => r.id === form.rawMaterialId) ?? null);

  const resetRmPickerUi = () => {
    setRmPickerOpen(false);
    setRmSearchInput("");
    setDebouncedRmSearch("");
    setPickedRm(null);
  };

  const rawMaterialTriggerLabel =
    selectedRm != null
      ? `${selectedRm.name} (${selectedRm.itemCode ?? "—"})`
      : null;

  return (
    <AppShell searchPlaceholder="Cari pembelian…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Belanja harian"
          description="Catat pembelian bahan baku (qty, harga per satuan, total). Ringkasan harian, mingguan, dan bulanan."
        >
          <DateField value={date} onChange={setDate} />
          <Button
            type="button"
            className="btn-gradient border-0"
            onClick={() => {
              setForm((f) => ({ ...f, expenseDate: date }));
              resetRmPickerUi();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Tambah pembelian
          </Button>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Total qty pembelian"
            icon={ShoppingCart}
            tone="emerald"
            footer="Jumlah kuantitas di periode filter"
          >
            {summary.data ? formatDecimalQty(summary.data.data.totalQty) : "—"}
          </StatCard>
          <Card className="border border-border bg-card shadow-sm ring-1 ring-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                {summary.data ? formatIdr(summary.data.data.totalExpenses) : "—"}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Periode sesuai tab di bawah
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Rentang: {summary.data?.data.from ?? "—"} → {summary.data?.data.to ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={range} onValueChange={(v) => setRange(v as Range)} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="pill">
              <TabsTrigger value="today">Harian</TabsTrigger>
              <TabsTrigger value="week">Mingguan</TabsTrigger>
              <TabsTrigger value="month">Bulanan</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {summary.data?.data.dailyBreakdown && summary.data.data.dailyBreakdown.length > 0 ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rincian per tanggal</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="surface-table-wrap overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Baris</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.data.data.dailyBreakdown.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell>{formatDate(d.date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.lineCount}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDecimalQty(d.totalQty)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatIdr(d.totalExpenses)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Bahan baku</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga / satuan</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Catatan</TableHead>
                {isAdmin ? <TableHead className="w-14 text-right">Aksi</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data?.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(row.expenseDate)}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {row.rawMaterial.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      {row.rawMaterial.itemCode ?? "—"} ·{" "}
                      {row.rawMaterial.unit.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatDecimalQty(row.qty)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatIdr(row.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatIdr(row.totalPrice)}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-slate-600 dark:text-slate-300">
                    {row.notes ? (
                      <span className="line-clamp-2 whitespace-pre-wrap">{row.notes}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setExpenseToDelete(row)}
                        aria-label="Hapus pembelian"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!list.data?.data?.length && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Belum ada pembelian di periode ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-1 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-foreground">
              Total pengeluaran (daftar):{" "}
              <span className="text-success">
                {metaSum ? formatIdr(metaSum.totalExpenditure) : formatIdr(0)}
              </span>
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {metaSum?.lineCount ?? 0} baris · qty kumulatif{" "}
              {formatDecimalQty(metaSum?.totalQty ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            resetRmPickerUi();
            setForm({
              rawMaterialId: "",
              qty: "1",
              unitPrice: "",
              totalPrice: "",
              notes: "",
              expenseDate: date,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah pembelian</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pilih bahan baku, isi kuantitas dan harga beli per satuan. Total opsional — jika
              dikosongkan, server menghitung dari qty × harga satuan.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <DateField
                value={form.expenseDate}
                onChange={(v) => setForm((f) => ({ ...f, expenseDate: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bahan baku</Label>
              <p className="text-xs text-muted-foreground">
                Ketik nama atau kode — pencarian lewat server (tidak terbatas 500 baris pertama).
              </p>
              <Popover
                open={rmPickerOpen}
                onOpenChange={(next) => {
                  setRmPickerOpen(next);
                  if (!next) {
                    setRmSearchInput("");
                    setDebouncedRmSearch("");
                  }
                }}
              >
                <PopoverTrigger
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-10 w-full justify-between font-normal",
                    !rawMaterialTriggerLabel && "text-muted-foreground",
                  )}
                >
                  <span className="truncate text-left">
                    {rawMaterialTriggerLabel ?? "Pilih bahan baku"}
                  </span>
                  <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[min(100vw-2rem,28rem)] p-0" align="start">
                  <div className="border-b border-border p-2">
                    <Input
                      placeholder="Cari nama / kode…"
                      value={rmSearchInput}
                      onChange={(e) => setRmSearchInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  {rawMaterialsPicker.isFetching ? (
                    <p className="p-3 text-xs text-muted-foreground">Memuat…</p>
                  ) : null}
                  {!rawMaterialsPicker.isFetching &&
                  rawMaterialsPicker.isSuccess &&
                  rmList.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      {debouncedRmSearch.trim()
                        ? "Tidak ada bahan baku yang cocok."
                        : "Belum ada bahan baku. Tambahkan di Inventori → Bahan baku."}
                    </p>
                  ) : null}
                  {!rawMaterialsPicker.isFetching && rmList.length > 0 ? (
                    <>
                      <ScrollArea className="h-[min(40vh,280px)]">
                        <ul className="p-1">
                          {rmList.map((r) => (
                            <li key={r.id}>
                              <button
                                type="button"
                                className={cn(
                                  "hover:bg-muted focus-visible:bg-muted flex w-full flex-col rounded-md px-2 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                                  form.rawMaterialId === r.id && "bg-muted",
                                )}
                                onClick={() => {
                                  setForm((f) => ({ ...f, rawMaterialId: r.id }));
                                  setPickedRm(r);
                                  setRmPickerOpen(false);
                                  setRmSearchInput("");
                                  setDebouncedRmSearch("");
                                }}
                              >
                                <span className="font-medium">
                                  {r.name}{" "}
                                  <span className="font-mono text-xs text-muted-foreground">
                                    ({r.itemCode ?? "—"})
                                  </span>
                                </span>
                                <span className="text-xs text-muted-foreground">{r.unit.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                      {rmMetaTotal != null && rmMetaTotal > rmList.length ? (
                        <p className="border-t border-border px-2 py-1.5 text-[0.7rem] text-muted-foreground">
                          Menampilkan {rmList.length} dari {rmMetaTotal}. Persempit kata kunci untuk
                          menemukan barang.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </PopoverContent>
              </Popover>
              {selectedRm ? (
                <p className="text-xs text-muted-foreground">
                  Satuan master: <strong>{selectedRm.unit.name}</strong> ({selectedRm.unit.code})
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kuantitas</Label>
                <Input
                  inputMode="decimal"
                  value={form.qty}
                  onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Harga beli / satuan (Rp)</Label>
                <Input
                  inputMode="decimal"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total (opsional)</Label>
              <Input
                inputMode="decimal"
                value={form.totalPrice}
                onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))}
                placeholder={
                  computedLineTotal != null ? String(Math.round(computedLineTotal)) : "qty × harga"
                }
              />
              {computedLineTotal != null ? (
                <p className="text-xs text-muted-foreground">
                  Perkiraan: {formatIdr(String(computedLineTotal))}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <textarea
                rows={2}
                placeholder="Supplier, nota, dll."
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={create.isPending || !canSubmit}
              onClick={() => create.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!expenseToDelete} onOpenChange={(o) => !o && setExpenseToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus pembelian?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {expenseToDelete ? (
                <>
                  {formatDate(expenseToDelete.expenseDate)} · {expenseToDelete.rawMaterial.name} ·{" "}
                  {formatIdr(expenseToDelete.totalPrice)} akan dihapus permanen.
                </>
              ) : null}
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setExpenseToDelete(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteExpense.isPending}
              onClick={() => expenseToDelete && deleteExpense.mutate(expenseToDelete.id)}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
