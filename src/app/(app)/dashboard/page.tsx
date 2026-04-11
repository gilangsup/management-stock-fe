"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, Receipt, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api";
import { formatIdr } from "@/lib/format";

export default function DashboardPage() {
  const stock = useQuery({
    queryKey: ["stock-meta"],
    queryFn: async () => {
      const { data } = await api.get<{ meta: { total: number } }>("/stock", { params: { limit: 1 } });
      return data;
    },
  });

  const expenseSummary = useQuery({
    queryKey: ["expense-summary-dash"],
    queryFn: async () => {
      const { data } = await api.get<{
        data: { totalExpenses: string; totalItemsPurchased: string };
      }>("/expenses/summary", { params: { range: "today" } });
      return data;
    },
  });

  const invoices = useQuery({
    queryKey: ["invoice-dash"],
    queryFn: async () => {
      const { data } = await api.get<{ data: unknown[] }>("/invoice-exchanges");
      return data;
    },
  });

  const receivables = useQuery({
    queryKey: ["recv-dash"],
    queryFn: async () => {
      const { data } = await api.get<{ data: { status: string }[] }>("/receivables");
      return data;
    },
  });

  const openRecv =
    receivables.data?.data.filter((r) => r.status !== "paid").length ?? "—";

  return (
    <AppShell searchPlaceholder="Cari operasi, aset, atau batch…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Dasbor"
          description="Ringkasan operasional harian dalam satu layar — warna menandakan kategori indikator."
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200">
            <Sparkles className="size-3.5 text-amber-500" />
            Ringkasan langsung
          </span>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total stok (item)" icon={Package} tone="blue">
            {stock.data?.meta?.total ?? "—"}
          </StatCard>
          <StatCard label="Belanja hari ini" icon={ShoppingCart} tone="emerald">
            {expenseSummary.data ? formatIdr(expenseSummary.data.data.totalExpenses) : "—"}
          </StatCard>
          <StatCard
            label="Penukaran faktur"
            icon={Receipt}
            tone="violet"
            footer="Transaksi tercatat"
          >
            {invoices.data?.data?.length ?? "—"}
          </StatCard>
          <StatCard label="Piutang aktif" icon={Wallet} tone="amber">
            {openRecv}
          </StatCard>
        </div>
      </div>
    </AppShell>
  );
}
