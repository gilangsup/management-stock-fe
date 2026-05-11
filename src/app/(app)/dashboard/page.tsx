"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, Receipt, ShoppingCart, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatIdr } from "@/lib/format";

type RecvRow = {
  status: string;
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
};

export default function DashboardPage() {
  const inventoryDash = useQuery({
    queryKey: ["dash-inventory"],
    queryFn: async () => {
      const [raw, fp] = await Promise.all([
        api.get<{ meta: { total: number } }>("/raw-materials", { params: { page: 1, limit: 1 } }),
        api.get<{ meta: { total: number } }>("/finished-products", {
          params: { page: 1, limit: 1 },
        }),
      ]);
      return { rawTotal: raw.data.meta.total, fpTotal: fp.data.meta.total };
    },
  });

  const expenseSummary = useQuery({
    queryKey: ["expense-summary-dash"],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { totalExpenses: string; totalQty: string };
      }>("/expenses/summary", { params: { range: "all" } });
      return data;
    },
  });

  const invoices = useQuery({
    queryKey: ["invoice-dash"],
    queryFn: async () => {
      const { data } = await api.get<{ data: { totalAmount: string }[] }>("/invoice-exchanges");
      return data;
    },
  });

  const receivables = useQuery({
    queryKey: ["recv-dash"],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecvRow[] }>("/receivables");
      return data;
    },
  });

  const invoiceCount = invoices.data?.data?.length ?? null;
  const invoiceTotal = invoices.data?.data
    ? invoices.data.data.reduce((sum, r) => sum + Number(r.totalAmount), 0)
    : null;

  const allRecv = receivables.data?.data ?? null;
  const unpaidRecv = allRecv?.filter((r) => r.status !== "paid") ?? null;
  const paidRecv = allRecv?.filter((r) => r.status === "paid") ?? null;

  const unpaidCount = unpaidRecv?.length ?? null;
  const unpaidTotal = unpaidRecv
    ? unpaidRecv.reduce((sum, r) => sum + Number(r.outstanding), 0)
    : null;

  const paidCount = paidRecv?.length ?? null;
  const paidTotal = paidRecv
    ? paidRecv.reduce((sum, r) => sum + Number(r.totalAmount), 0)
    : null;

  const grandRecvTotal = allRecv
    ? allRecv.reduce((sum, r) => sum + Number(r.totalAmount), 0)
    : null;
  const totalPaidAmount = allRecv
    ? allRecv.reduce((sum, r) => sum + Number(r.paidAmount), 0)
    : null;
  const collectionRate =
    grandRecvTotal && grandRecvTotal > 0
      ? Math.round((totalPaidAmount! / grandRecvTotal) * 100)
      : 0;

  return (
    <AppShell searchPlaceholder="Cari operasi, aset, atau batch…">
      <div className={pageStackWide}>
        <PageHeader
          title="Dasbor"
          description="Ringkasan operasional harian dalam satu layar."
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-muted-foreground" />
            Ringkasan langsung
          </span>
        </PageHeader>

        {/* Top stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="SKU inventori"
            icon={Package}
            tone="blue"
            footer="Bahan baku dan barang jadi"
          >
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg font-bold sm:text-2xl">
              <span className="tabular-nums">
                <span className="mr-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Bahan
                </span>
                {inventoryDash.data?.rawTotal ?? "—"}
              </span>
              <span className="tabular-nums">
                <span className="mr-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Jadi
                </span>
                {inventoryDash.data?.fpTotal ?? "—"}
              </span>
            </div>
          </StatCard>

          <StatCard label="Total belanja" icon={ShoppingCart} tone="emerald" footer="Semua waktu">
            {expenseSummary.data ? formatIdr(expenseSummary.data.data.totalExpenses) : "—"}
          </StatCard>

          <StatCard
            label="Penukaran faktur"
            icon={Receipt}
            tone="violet"
            footer={invoiceCount !== null ? `${invoiceCount} transaksi tercatat` : "Transaksi tercatat"}
          >
            {invoiceTotal !== null ? formatIdr(invoiceTotal) : "—"}
          </StatCard>
        </div>

        {/* Piutang overview card */}
        <Card className="relative overflow-hidden border-border shadow-sm ring-1 ring-border">
          {/* top accent bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/60 via-amber-400/60 to-emerald-500/60" />

          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
                <Wallet className="size-4 text-foreground/80" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Ringkasan Piutang</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {allRecv !== null ? `${allRecv.length} total piutang` : "Memuat…"}
                </p>
              </div>
            </div>

            {/* Collection rate badge */}
            {allRecv !== null && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-800 dark:bg-emerald-950">
                <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {collectionRate}% terkumpul
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Rp 0</span>
                <span>{grandRecvTotal !== null ? formatIdr(grandRecvTotal) : "—"}</span>
              </div>
            </div>

            {/* Two-column breakdown */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Belum lunas */}
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-destructive" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Belum Lunas
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-destructive">
                  {unpaidTotal !== null ? formatIdr(unpaidTotal) : "—"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {unpaidCount !== null ? `${unpaidCount} piutang` : "—"}
                </p>
              </div>

              {/* Sudah lunas */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                <div className="mb-1 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sudah Lunas
                  </span>
                </div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {paidTotal !== null ? formatIdr(paidTotal) : "—"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paidCount !== null ? `${paidCount} piutang` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
