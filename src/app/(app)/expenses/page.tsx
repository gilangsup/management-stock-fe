"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ExpensePurchaseDialog } from "@/components/expenses/expense-purchase-dialog";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RawMaterialCombobox } from "@/components/expenses/raw-material-combobox";
import type { RawMaterialRow } from "@/components/inventory/types";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredUser } from "@/lib/auth-storage";
import { formatDate, formatDecimalQty, formatIdr } from "@/lib/format";

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
    costPrice?: string;
    unit: { id: string; code: string; name: string };
  };
};

export default function ExpensesPage() {
  const qc = useQueryClient();
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [range, setRange] = useState<Range>("today");
  const [date, setDate] = useState(anchor);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRow | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseRow | null>(null);
  const [editForm, setEditForm] = useState({
    expenseDate: "",
    rawMaterialId: "",
    qty: "",
    unitPrice: "",
    totalPrice: "",
    notes: "",
  });
  /** costPrice dari bahan baku yang sedang dipilih di form edit, untuk tampil sebagai referensi. */
  const [editMasterCostPrice, setEditMasterCostPrice] = useState("");

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

  useEffect(() => {
    if (!expenseToEdit) return;
    const d = expenseToEdit.expenseDate.slice(0, 10);
    setEditForm({
      expenseDate: d,
      rawMaterialId: expenseToEdit.rawMaterial.id,
      qty: String(expenseToEdit.qty),
      unitPrice: String(Number(expenseToEdit.unitPrice)),
      totalPrice: String(expenseToEdit.totalPrice),
      notes: expenseToEdit.notes ?? "",
    });
    setEditMasterCostPrice(expenseToEdit.rawMaterial.costPrice ?? "");
  }, [expenseToEdit]);

  function buildExpensePatchBody(original: ExpenseRow): Record<string, unknown> | null {
    const body: Record<string, unknown> = {};
    const origDate = original.expenseDate.slice(0, 10);
    if (editForm.expenseDate !== origDate) body.expenseDate = editForm.expenseDate;
    if (editForm.rawMaterialId !== original.rawMaterial.id) {
      body.rawMaterialId = editForm.rawMaterialId;
    }

    const qtyNum = Number(editForm.qty);
    const origQtyNum = Number(original.qty);
    const origUnitNum = Number(original.unitPrice);
    const qtyChanged =
      editForm.qty.trim() !== "" && Number.isFinite(qtyNum) && qtyNum !== origQtyNum;

    const hasUnitPrice = editForm.unitPrice.trim() !== "";
    const unitNum = hasUnitPrice ? Number(editForm.unitPrice) : NaN;
    const unitChanged =
      hasUnitPrice && Number.isFinite(unitNum) && unitNum !== origUnitNum;

    if (qtyChanged) body.qty = qtyNum;
    if (unitChanged) body.unitPrice = unitNum;

    const tpTrim = editForm.totalPrice.trim();
    const origTpNum = Number(original.totalPrice);
    const tpProvided = tpTrim !== "" && Number.isFinite(Number(tpTrim));
    const tpNum = tpProvided ? Number(tpTrim) : NaN;

    if (qtyChanged || unitChanged) {
      if (tpProvided && Number.isFinite(tpNum) && tpNum !== origTpNum) {
        body.totalPrice = tpNum;
      }
    } else if (tpProvided && Number.isFinite(tpNum) && tpNum !== origTpNum) {
      body.totalPrice = tpNum;
    }

    const n = editForm.notes.trim();
    const origN = (original.notes ?? "").trim();
    if (n === "" && origN !== "") {
      body.notes = null;
    } else if (n !== origN) {
      body.notes = n === "" ? null : n;
    }

    if (Object.keys(body).length === 0) return null;
    return body;
  }

  const patchExpense = useMutation({
    mutationFn: async () => {
      if (!expenseToEdit) return;
      const body = buildExpensePatchBody(expenseToEdit);
      if (!body) throw new Error("NO_CHANGES");
      const { data } = await api.patch<{ success: boolean; data: ExpenseRow }>(
        `/expenses/${expenseToEdit.id}`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Pembelian diperbarui");
      setExpenseToEdit(null);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      qc.invalidateQueries({ queryKey: ["expense-summary-dash"] });
    },
    onError: (e: unknown) => {
      if (e instanceof Error && e.message === "NO_CHANGES") {
        toast.error("Tidak ada perubahan untuk disimpan.");
        return;
      }
      toast.error(getApiErrorMessage(e, "Gagal memperbarui pembelian"));
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

  const unitPriceEditValid =
    editForm.unitPrice.trim() === "" ||
    (Number.isFinite(Number(editForm.unitPrice)) && Number(editForm.unitPrice) >= 0);

  const canSubmitEdit =
    expenseToEdit &&
    editForm.rawMaterialId &&
    editForm.expenseDate &&
    Number(editForm.qty) > 0 &&
    !Number.isNaN(Number(editForm.qty)) &&
    unitPriceEditValid;

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
            onClick={() => setPurchaseOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Tambah pembelian
          </Button>
        </PageHeader>

        <ExpensePurchaseDialog
          open={purchaseOpen}
          onOpenChange={setPurchaseOpen}
          anchorDate={date}
        />

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
                <TableHead className="w-[100px] text-right">Aksi</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setExpenseToEdit(row)}
                        aria-label="Ubah pembelian"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      {isAdmin ? (
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
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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

      <Dialog open={!!expenseToEdit} onOpenChange={(o) => !o && setExpenseToEdit(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ubah pembelian</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Hanya field yang berubah yang dikirim ke server. Mengubah qty atau harga satuan tanpa
              mengisi total akan membuat total dihitung ulang (qty × harga). Kosongkan catatan lalu
              simpan untuk menghapus catatan.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <DateField
                value={editForm.expenseDate}
                onChange={(v) => setEditForm((f) => ({ ...f, expenseDate: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bahan baku</Label>
              <RawMaterialCombobox
                key={expenseToEdit?.id ?? "new"}
                value={editForm.rawMaterialId}
                onChange={(id) => setEditForm((f) => ({ ...f, rawMaterialId: id }))}
                onSelect={(row: RawMaterialRow) => {
                  const cp = Number(row.costPrice);
                  setEditMasterCostPrice(row.costPrice ?? "");
                  if (cp > 0) {
                    setEditForm((f) => ({ ...f, unitPrice: String(cp) }));
                  }
                }}
                disabled={patchExpense.isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kuantitas</Label>
                <Input
                  inputMode="decimal"
                  value={editForm.qty}
                  onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))}
                  disabled={patchExpense.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Harga / satuan (Rp)
                  <span className="ml-1 text-xs font-normal text-muted-foreground">— opsional</span>
                </Label>
                <Input
                  inputMode="decimal"
                  placeholder="Kosongkan untuk pakai harga master"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  disabled={patchExpense.isPending}
                />
                {editMasterCostPrice && Number(editMasterCostPrice) > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Harga acuan master:{" "}
                    <span className="font-medium text-primary/80">
                      {formatIdr(editMasterCostPrice)}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total (opsional)</Label>
              <Input
                inputMode="decimal"
                value={editForm.totalPrice}
                onChange={(e) => setEditForm((f) => ({ ...f, totalPrice: e.target.value }))}
                placeholder="Kosongkan jika mengandalkan hitung otomatis setelah ubah qty/harga"
                disabled={patchExpense.isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                Jika qty atau harga berubah dan total tidak Anda ubah dari nilai lama, server
                menghitung ulang. Isi total hanya bila ingin nilai khusus.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <textarea
                rows={2}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Kosongkan untuk hapus catatan (simpan)"
                disabled={patchExpense.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setExpenseToEdit(null)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={!canSubmitEdit || patchExpense.isPending}
              onClick={() => patchExpense.mutate()}
            >
              {patchExpense.isPending ? "Menyimpan…" : "Simpan"}
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
