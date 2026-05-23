"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { escapeHtml, printHtmlDocument } from "@/lib/export-utils";
import { formatDate, formatIdr } from "@/lib/format";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import {
  ReportDateFilter,
  ReportHotelFilter,
  ReportResetButton,
  resolveDateRange,
  type DatePreset,
} from "@/components/reports/report-filters";

type Hotel = { id: string; name: string };

type GroupBy = "none" | "day" | "week" | "month" | "year";

type InvoiceListRow = {
  id: string;
  transactionCode: string;
  saleDate: string;
  grandTotal: string;
  hotel: { code: string; name: string };
};

type GroupedRow = {
  period: string;
  invoiceCount: number;
  totalAmount: string;
};

const GROUP_LABELS: Record<GroupBy, string> = {
  none: "Detail faktur",
  day: "Per hari",
  week: "Per minggu",
  month: "Per bulan",
  year: "Per tahun",
};

export function SalesInvoicesReportTab() {
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState(anchor);
  const [customTo, setCustomTo] = useState(anchor);
  const [hotelId, setHotelId] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [page, setPage] = useState(1);
  const { from, to } = resolveDateRange(preset, customFrom, customTo);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
  });

  const query = useQuery({
    queryKey: ["reports", "sales-invoices", from, to, hotelId, groupBy, page],
    queryFn: async () => {
      const params: Record<string, string> = { from, to, groupBy };
      if (hotelId) params.hotelId = hotelId;
      if (groupBy === "none") {
        params.page = String(page);
        params.limit = "50";
      }
      const { data } = await api.get<{
        data:
          | { mode: "grouped"; groups: GroupedRow[]; grandTotal: string }
          | { mode: "list"; invoices: InvoiceListRow[]; grandTotal: string };
        meta: { total?: number; limit?: number };
      }>("/reports/sales-invoices", { params });
      return data;
    },
  });

  const reportData = query.data?.data;
  const mode = reportData?.mode ?? "list";
  const grandTotal = reportData?.grandTotal ?? "0";
  const hotelLabel = hotelId
    ? (hotels.data?.find((h) => h.id === hotelId)?.name ?? hotelId)
    : "Semua hotel";

  const groupedRows: GroupedRow[] =
    reportData?.mode === "grouped" ? reportData.groups : [];
  const listRows: InvoiceListRow[] =
    reportData?.mode === "list" ? reportData.invoices : [];
  const total = query.data?.meta.total ?? 0;
  const limit = query.data?.meta.limit ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const printPdf = useCallback(() => {
    if (mode === "grouped") {
      const body = groupedRows
        .map(
          (r) =>
            `<tr>
              <td>${escapeHtml(r.period)}</td>
              <td class="text-right">${r.invoiceCount}</td>
              <td class="text-right">${escapeHtml(formatIdr(r.totalAmount))}</td>
            </tr>`,
        )
        .join("");
      printHtmlDocument(
        `Laporan faktur ${from}–${to}`,
        `<h1>Laporan Faktur Penjualan — ${escapeHtml(GROUP_LABELS[groupBy])}</h1>
         <p class="meta">${escapeHtml(formatDate(from))} – ${escapeHtml(formatDate(to))} · ${escapeHtml(hotelLabel)}</p>
         <table>
           <thead><tr><th>Periode</th><th class="text-right">Jumlah faktur</th><th class="text-right">Total</th></tr></thead>
           <tbody>${body}</tbody>
           <tfoot><tr><td class="text-right">Grand total</td><td></td><td class="text-right">${escapeHtml(formatIdr(grandTotal))}</td></tr></tfoot>
         </table>`,
      );
      return;
    }
    const body = listRows
      .map(
        (r) =>
          `<tr>
            <td>${escapeHtml(r.transactionCode)}</td>
            <td>${escapeHtml(formatDate(r.saleDate))}</td>
            <td>${escapeHtml(r.hotel.name)}</td>
            <td class="text-right">${escapeHtml(formatIdr(r.grandTotal))}</td>
          </tr>`,
      )
      .join("");
    printHtmlDocument(
      `Laporan faktur ${from}–${to}`,
      `<h1>Laporan Faktur Penjualan</h1>
       <p class="meta">${escapeHtml(formatDate(from))} – ${escapeHtml(formatDate(to))} · ${escapeHtml(hotelLabel)}</p>
       <table>
         <thead><tr><th>Kode faktur</th><th>Tanggal</th><th>Hotel</th><th class="text-right">Total</th></tr></thead>
         <tbody>${body}</tbody>
         <tfoot><tr><td colspan="3" class="text-right">Grand total</td><td class="text-right">${escapeHtml(formatIdr(grandTotal))}</td></tr></tfoot>
       </table>`,
    );
  }, [mode, groupedRows, listRows, from, to, groupBy, hotelLabel, grandTotal]);

  const hasData = mode === "grouped" ? groupedRows.length > 0 : listRows.length > 0;

  return (
    <div className="space-y-4">
      <div className="surface-panel space-y-4 rounded-2xl border border-border p-4">
        <ReportDateFilter
          preset={preset}
          onPresetChange={(p) => {
            setPreset(p);
            setPage(1);
          }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={(v) => {
            setCustomFrom(v);
            setPage(1);
          }}
          onCustomToChange={(v) => {
            setCustomTo(v);
            setPage(1);
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <ReportHotelFilter
            hotelId={hotelId}
            onHotelIdChange={(v) => {
              setHotelId(v);
              setPage(1);
            }}
            hotels={hotels.data ?? []}
          />
          <div className="space-y-2">
            <Label>Kelompokkan</Label>
            <Select
              value={groupBy}
              onValueChange={(v) => {
                setGroupBy(v as GroupBy);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(GROUP_LABELS) as GroupBy[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {GROUP_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ReportResetButton
          onReset={() => {
            setPreset("month");
            setCustomFrom(anchor);
            setCustomTo(anchor);
            setHotelId("");
            setGroupBy("none");
            setPage(1);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatCard label="Total penjualan" icon={Receipt} tone="violet" className="min-w-[200px]">
          {formatIdr(grandTotal)}
        </StatCard>
        <ReportExportActions
          exportPath="/reports/sales-invoices/export"
          params={{ from, to, hotelId: hotelId || undefined, groupBy }}
          onPrintPdf={printPdf}
          disabled={!hasData || query.isLoading}
          label="laporan faktur"
        />
      </div>

      <div className="surface-table-wrap">
        <Table>
          {mode === "grouped" ? (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Jumlah faktur</TableHead>
                  <TableHead className="text-right">Total penjualan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRows.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="font-medium tabular-nums">{r.period}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.invoiceCount}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatIdr(r.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : (
            <>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode faktur</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.transactionCode}</TableCell>
                    <TableCell>{formatDate(r.saleDate)}</TableCell>
                    <TableCell>
                      {r.hotel.name}
                      <span className="ml-1 text-xs text-muted-foreground">({r.hotel.code})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatIdr(r.grandTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          )}
          {!hasData && (
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {query.isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Memuat…
                    </span>
                  ) : (
                    "Tidak ada faktur untuk filter ini."
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
        {mode === "list" && total > limit ? (
          <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Halaman {page} dari {totalPages} · {total} faktur
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
        ) : null}
      </div>
    </div>
  );
}
