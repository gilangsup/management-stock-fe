"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDate, formatDecimalQty, formatIdr } from "@/lib/format";
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

const RAW_MATERIAL_PICKER_LIMIT = 500;

/** Kuantitas dan harga satuan keduanya terisi → total mengikuti perkalian (bukan input manual). */
function isExpenseTotalFromQtyAndUnit(qty: string, unitPrice: string): boolean {
  const tq = qty.trim();
  const tu = unitPrice.trim();
  if (tq === "" || tu === "") return false;
  const q = Number(tq);
  const u = Number(tu);
  return Number.isFinite(q) && Number.isFinite(u);
}

export default function ExpensesPage() {
  const qc = useQueryClient();
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [range, setRange] = useState<Range>("today");
  const [date, setDate] = useState(anchor);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rawMaterialId: "",
    qty: "1",
    unitPrice: "",
    totalPrice: "",
    notes: "",
    expenseDate: anchor,
  });

  const rawMaterialsPicker = useQuery({
    queryKey: ["raw-materials", "picker"],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<RawMaterialRow>>("/raw-materials", {
        params: { page: 1, limit: RAW_MATERIAL_PICKER_LIMIT },
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
      if (!isExpenseTotalFromQtyAndUnit(form.qty, form.unitPrice)) {
        const tp = form.totalPrice.trim();
        if (tp !== "") {
          const n = Number(tp);
          if (Number.isFinite(n)) base.totalPrice = n;
        }
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

  const metaSum = list.data?.meta.summary;

  /** Terisi otomatis dari qty × harga satuan (keduanya harus diisi, bukan string kosong). */
  const computedLineTotal = useMemo(() => {
    if (!isExpenseTotalFromQtyAndUnit(form.qty, form.unitPrice)) return null;
    const q = Number(form.qty.trim());
    const u = Number(form.unitPrice.trim());
    return q * u;
  }, [form.qty, form.unitPrice]);

  const totalFromQtyAndUnit = computedLineTotal != null;

  const canSubmit =
    form.rawMaterialId &&
    Number(form.qty) > 0 &&
    Number(form.unitPrice) >= 0 &&
    !Number.isNaN(Number(form.qty)) &&
    !Number.isNaN(Number(form.unitPrice));

  const rmList = rawMaterialsPicker.data?.data ?? [];
  const selectedRm = rmList.find((r) => r.id === form.rawMaterialId);

  return (
    <AppShell searchPlaceholder="Cari pembelian…">
      <div className={pageStackWide}>
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
                </TableRow>
              ))}
              {!list.data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
              {rawMaterialsPicker.isLoading ? (
                <p className="text-xs text-muted-foreground">Memuat daftar…</p>
              ) : null}
              {!rawMaterialsPicker.isLoading && rmList.length === 0 ? (
                <p className="text-xs text-destructive">
                  Belum ada bahan baku. Tambahkan di Inventori → Bahan baku.
                </p>
              ) : null}
              <Select
                value={form.rawMaterialId || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, rawMaterialId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih bahan baku">
                    {(val) => {
                      const r = rmList.find((x) => x.id === val);
                      if (!r) return undefined;
                      return `${r.name} (${r.itemCode ?? "—"})`;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rmList.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.itemCode ?? "—"}) · {r.unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                disabled={totalFromQtyAndUnit}
                value={
                  totalFromQtyAndUnit
                    ? String(computedLineTotal)
                    : form.totalPrice
                }
                onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))}
                placeholder={totalFromQtyAndUnit ? undefined : "qty × harga"}
              />
              {totalFromQtyAndUnit ? (
                <p className="text-xs text-muted-foreground">
                  Mengikuti kuantitas × harga satuan ({formatIdr(String(computedLineTotal))}). Kosongkan
                  salah satu isian di atas jika ingin mengisi total manual.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Jika dikosongkan, server menghitung dari kuantitas × harga satuan setelah keduanya
                  diisi.
                </p>
              )}
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
    </AppShell>
  );
}
