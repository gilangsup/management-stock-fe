"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api";
import { escapeHtml, printHtmlDocument } from "@/lib/export-utils";
import { formatDate, formatIdr } from "@/lib/format";
import { APP_NAME, COMPANY_ADDRESS, COMPANY_PHONES } from "@/lib/brand";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import {
  ReportDateFilter,
  ReportHotelFilter,
  ReportResetButton,
  resolveDateRange,
  type DatePreset,
} from "@/components/reports/report-filters";

type Hotel = { id: string; name: string };

type InvoiceListRow = {
  id: string;
  transactionCode: string;
  saleDate: string;
  grandTotal: string;
  totalQty: string;
  hotel: { code: string; name: string };
};

const rekapStyles = `
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #111; margin: 12mm 14mm; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #222; padding-bottom: 8px; }
  .company-block { flex: 1; }
  .report-title { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; margin: 0 0 3px; }
  .company-name { font-size: 11px; font-weight: 700; margin: 0 0 1px; }
  .company-detail { font-size: 9px; color: #555; margin: 0; }
  .periode-block { text-align: right; font-size: 10px; }
  .periode-block p { margin: 0 0 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #aaa; padding: 3px 6px; font-size: 9.5px; }
  th { background: #e0e0e0; font-weight: 700; text-align: left; }
  .num { text-align: right; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  tfoot td { font-weight: 700; background: #e8e8e8; border-top: 2px solid #555; }
  .summary-block { margin-top: 8px; display: flex; justify-content: flex-end; }
  .summary-table { border-collapse: collapse; min-width: 260px; }
  .summary-table td { border: 1px solid #aaa; padding: 3px 10px; font-size: 10px; }
  .summary-table .label { font-weight: 700; }
  .summary-table .val { text-align: right; }
  @media print { body { margin: 8mm 10mm; } }
`;

type SalesProductRow = {
  finishedProductId: string;
  itemCode: string;
  productName: string;
  unit: { code: string; name: string };
  invoiceCount: number;
  totalQty: string;
  totalAmount: string;
};

type ChartPoint = { period: string; amount: number };

function resolveChartGroupBy(
  preset: DatePreset,
  from: string,
  to: string,
): "day" | "month" | "year" {
  if (preset === "year") return "month";
  if (preset === "custom") {
    const days =
      Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days > 365) return "year";
    if (days > 60) return "month";
    return "day";
  }
  return "day";
}

function yTickFormatter(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return String(v);
}

export function SalesByProductTab() {
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState(anchor);
  const [customTo, setCustomTo] = useState(anchor);
  const [hotelId, setHotelId] = useState("");
  const { from, to } = resolveDateRange(preset, customFrom, customTo);

  const chartGroupBy = useMemo(
    () => resolveChartGroupBy(preset, from, to),
    [preset, from, to],
  );

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
  });

  const query = useQuery({
    queryKey: ["reports", "sales-by-product", from, to, hotelId],
    queryFn: async () => {
      const params: Record<string, string> = { from, to };
      if (hotelId) params.hotelId = hotelId;
      const { data } = await api.get<{ data: SalesProductRow[] }>(
        "/reports/sales-by-product",
        { params },
      );
      return data.data;
    },
  });

  const chartQuery = useQuery({
    queryKey: ["reports", "sales-by-period-chart", from, to, hotelId, chartGroupBy],
    queryFn: async () => {
      const params: Record<string, string> = { from, to, groupBy: chartGroupBy };
      if (hotelId) params.hotelId = hotelId;
      const { data } = await api.get<{
        data: {
          mode: string;
          groups: { period: string; invoiceCount: number; totalAmount: string }[];
          grandTotal: string;
        };
      }>("/reports/sales-invoices", { params });
      if (data.data.mode !== "grouped") return [];
      return data.data.groups.map((g): ChartPoint => ({
        period: g.period,
        amount: Number(g.totalAmount),
      }));
    },
  });

  const rows = query.data ?? [];
  const chartData = chartQuery.data ?? [];

  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + Number(r.totalAmount), 0),
    [rows],
  );
  const hotelLabel = hotelId
    ? (hotels.data?.find((h) => h.id === hotelId)?.name ?? hotelId)
    : "Semua hotel";

  const [isPrinting, setIsPrinting] = useState(false);

  const printPdf = useCallback(async () => {
    setIsPrinting(true);
    try {
      const params: Record<string, string> = { from, to, groupBy: "none", limit: "1000", page: "1" };
      if (hotelId) params.hotelId = hotelId;
      const { data: res } = await api.get<{
        data: { mode: string; invoices: InvoiceListRow[]; grandTotal: string };
      }>("/reports/sales-invoices", { params });

      const invoices: InvoiceListRow[] = res.data.mode === "list" ? res.data.invoices : [];
      const grandInvoiceTotal = res.data.grandTotal ?? "0";
      const totalQtyAll = invoices.reduce((s, r) => s + Number(r.totalQty), 0);

      const body = invoices
        .map(
          (r) =>
            `<tr>
              <td>${escapeHtml(r.transactionCode)}</td>
              <td>${escapeHtml(formatDate(r.saleDate))}</td>
              <td>${escapeHtml(r.hotel.code)}</td>
              <td class="num">${Number(r.totalQty).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="num">${escapeHtml(formatIdr(r.grandTotal))}</td>
            </tr>`,
        )
        .join("");

      printHtmlDocument(
        `Penjualan ${from}–${to}`,
        `<style>${rekapStyles}</style>
         <div class="report-header">
           <div class="company-block">
             <p class="report-title">LAPORAN PENJUALAN REKAP</p>
             <p class="company-name">${escapeHtml(APP_NAME)}</p>
             <p class="company-detail">${escapeHtml(COMPANY_ADDRESS)}</p>
             <p class="company-detail">${escapeHtml(COMPANY_PHONES)}</p>
           </div>
           <div class="periode-block">
             <p><strong>PERIODE :</strong> ${escapeHtml(formatDate(from))} – ${escapeHtml(formatDate(to))}</p>
             <p>Hotel : ${escapeHtml(hotelLabel)}</p>
           </div>
         </div>
         <table>
           <thead>
             <tr>
               <th>No Transaksi</th>
               <th>Tanggal</th>
               <th>Kode Pelanggan</th>
               <th class="num">Jml Item</th>
               <th class="num">Sub Total</th>
             </tr>
           </thead>
           <tbody>${body || '<tr><td colspan="5" style="text-align:center;color:#999">Tidak ada data</td></tr>'}</tbody>
           <tfoot>
             <tr>
               <td colspan="3"><strong>TOTAL KESELURUHAN :</strong></td>
               <td class="num">${totalQtyAll.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
               <td class="num">${escapeHtml(formatIdr(grandInvoiceTotal))}</td>
             </tr>
           </tfoot>
         </table>
         <div class="summary-block">
           <table class="summary-table">
             <tr><td class="label">Jumlah Item</td><td class="label">:</td><td class="val">${totalQtyAll.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td></tr>
             <tr><td class="label">Sub Total</td><td class="label">:</td><td class="val">${escapeHtml(formatIdr(grandInvoiceTotal))}</td></tr>
           </table>
         </div>`,
      );
    } catch {
      toast.error("Gagal memuat data untuk PDF");
    } finally {
      setIsPrinting(false);
    }
  }, [from, to, hotelId, hotelLabel]);

  return (
    <div className="space-y-4">
      <div className="surface-panel space-y-4 rounded-2xl border border-border p-4">
        <ReportDateFilter
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        <ReportHotelFilter
          hotelId={hotelId}
          onHotelIdChange={setHotelId}
          hotels={hotels.data ?? []}
        />
        <ReportResetButton
          onReset={() => {
            setPreset("month");
            setCustomFrom(anchor);
            setCustomTo(anchor);
            setHotelId("");
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatCard label="Total penjualan" icon={Package} tone="blue" className="min-w-[200px]">
          {formatIdr(grandTotal)}
        </StatCard>
        <ReportExportActions
          exportPath="/reports/sales-by-product/export"
          params={{ from, to, hotelId: hotelId || undefined }}
          onPrintPdf={() => void printPdf()}
          disabled={!rows.length || query.isLoading || isPrinting}
          label="penjualan per produk"
        />
      </div>

      {/* ── Diagram Batang Penjualan per Periode ─────────────────────────── */}
      <div className="surface-panel rounded-2xl border border-border p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Diagram Penjualan per Periode</p>
        {chartQuery.isLoading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-dashed">
            <p className="text-sm text-muted-foreground">
              Tidak ada data penjualan untuk periode ini.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={yTickFormatter}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-sm">
                      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
                      <p className="font-semibold text-primary">
                        {formatIdr(payload[0].value as number)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="amount"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={64}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Tabel Report per Produk (existing, tidak diubah) ─────────────── */}
      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Faktur</TableHead>
              <TableHead className="text-right">Total qty</TableHead>
              <TableHead className="text-right">Total penjualan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.finishedProductId}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium">{r.productName}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {r.itemCode}
                  </span>
                </TableCell>
                <TableCell>{r.unit.code}</TableCell>
                <TableCell className="text-right tabular-nums">{r.invoiceCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(r.totalQty).toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatIdr(r.totalAmount)}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {query.isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Memuat…
                    </span>
                  ) : (
                    "Tidak ada data penjualan untuk filter ini."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
