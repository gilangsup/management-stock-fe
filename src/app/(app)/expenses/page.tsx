"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
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
import { api } from "@/lib/api";
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
    unit: { id: string; code: string; name: string };
  };
};

export default function ExpensesPage() {
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [range, setRange] = useState<Range>("today");
  const [date, setDate] = useState(anchor);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

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

  const metaSum = list.data?.meta.summary;

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
    </AppShell>
  );
}
