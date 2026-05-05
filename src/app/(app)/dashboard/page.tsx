"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, Receipt, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api";
import { formatIdr } from "@/lib/format";

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
      const { data } = await api.get<{
        data: { status: string; outstanding: string }[];
      }>("/receivables");
      return data;
    },
  });

  const activeRecv = receivables.data?.data.filter((r) => r.status !== "paid") ?? null;
  const openRecvCount = activeRecv?.length ?? "—";
  const openRecvTotal = activeRecv
    ? activeRecv.reduce((sum, r) => sum + Number(r.outstanding), 0)
    : null;

  const invoiceCount = invoices.data?.data?.length ?? "—";
  const invoiceTotal = invoices.data?.data
    ? invoices.data.data.reduce((sum, r) => sum + Number(r.totalAmount), 0)
    : null;

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            footer="Transaksi tercatat"
          >
            {invoiceCount}
            {invoiceTotal !== null && (
              <p className="mt-0.5 text-base font-semibold tabular-nums text-primary">
                {formatIdr(invoiceTotal)}
              </p>
            )}
          </StatCard>
          <StatCard label="Piutang aktif" icon={Wallet} tone="amber" footer="Piutang belum lunas">
            {openRecvCount}
            {openRecvTotal !== null && (
              <p className="mt-0.5 text-base font-semibold tabular-nums text-destructive">
                {formatIdr(openRecvTotal)}
              </p>
            )}
          </StatCard>
        </div>
      </div>
    </AppShell>
  );
}
