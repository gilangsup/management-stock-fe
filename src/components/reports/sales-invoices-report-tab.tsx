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

type GroupBy = "none" | "day" | "week" | "month" | "year";

type PoFilter = "all" | "with" | "without";

type InvoiceListRow = {
  id: string;
  transactionCode: string;
  saleDate: string;
  grandTotal: string;
  totalQty: string;
  poNumber: string | null;
  hotel: { code: string; name: string };
};

const PO_FILTER_LABELS: Record<PoFilter, string> = {
  all: "Semua",
  with: "Dengan PO",
  without: "Tanpa PO",
};

function formatPoNumber(po: string | null | undefined): string {
  const v = po?.trim();
  return v ? v : "—";
}

async function fetchAllInvoicesForPrint(params: {
  from: string;
  to: string;
  hotelId?: string;
}): Promise<InvoiceListRow[]> {
  const all: InvoiceListRow[] = [];
  let page = 1;
  const limit = 200;

  while (true) {
    const queryParams: Record<string, string> = {
      from: params.from,
      to: params.to,
      groupBy: "none",
      page: String(page),
      limit: String(limit),
      poFilter: "all",
    };
    if (params.hotelId) queryParams.hotelId = params.hotelId;

    const { data } = await api.get<{
      data: { mode: "list"; invoices: InvoiceListRow[] };
      meta: { total?: number };
    }>("/reports/sales-invoices", { params: queryParams });

    if (data.data.mode !== "list") break;
    all.push(...data.data.invoices);
    const total = data.meta.total ?? all.length;
    if (all.length >= total) break;
    page += 1;
  }

  return all;
}

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
  const [poFilter, setPoFilter] = useState<PoFilter>("all");
  const [page, setPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const { from, to } = resolveDateRange(preset, customFrom, customTo);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
  });

  const query = useQuery({
    queryKey: ["reports", "sales-invoices", from, to, hotelId, groupBy, poFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = { from, to, groupBy };
      if (hotelId) params.hotelId = hotelId;
      if (groupBy === "none") {
        params.page = String(page);
        params.limit = "50";
        params.poFilter = poFilter;
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

  const printPdf = useCallback(async () => {
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

    if (mode === "grouped") {
      const totalInvoices = groupedRows.reduce((s, r) => s + r.invoiceCount, 0);
      const body = groupedRows
        .map(
          (r) =>
            `<tr>
              <td>${escapeHtml(r.period)}</td>
              <td class="num">${r.invoiceCount}</td>
              <td class="num">${escapeHtml(formatIdr(r.totalAmount))}</td>
            </tr>`,
        )
        .join("");
      printHtmlDocument(
        `Laporan Penjualan ${from}–${to}`,
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
             <p>Kelompok : ${escapeHtml(GROUP_LABELS[groupBy])}</p>
           </div>
         </div>
         <table>
           <thead><tr><th>Periode</th><th class="num">Jumlah Faktur</th><th class="num">Sub Total</th></tr></thead>
           <tbody>${body}</tbody>
           <tfoot><tr><td><strong>TOTAL KESELURUHAN</strong></td><td class="num">${totalInvoices}</td><td class="num">${escapeHtml(formatIdr(grandTotal))}</td></tr></tfoot>
         </table>`,
      );
      return;
    }

    setIsPrinting(true);
    try {
      const pdfRows = await fetchAllInvoicesForPrint({
        from,
        to,
        hotelId: hotelId || undefined,
      });

      const pdfGrandTotal = pdfRows.reduce((s, r) => s + Number(r.grandTotal), 0);
      const totalQtyAll = pdfRows.reduce((s, r) => s + Number(r.totalQty), 0);
      const body = pdfRows
        .map(
          (r) =>
            `<tr>
              <td>${escapeHtml(formatDate(r.saleDate))}</td>
              <td>${escapeHtml(r.hotel.name)}</td>
              <td>${escapeHtml(formatPoNumber(r.poNumber))}</td>
              <td>${escapeHtml(r.transactionCode)}</td>
              <td class="num">${Number(r.totalQty).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
              <td class="num">${escapeHtml(formatIdr(r.grandTotal))}</td>
            </tr>`,
        )
        .join("");
      printHtmlDocument(
        `Laporan Penjualan ${from}–${to}`,
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
               <th>Tanggal</th>
               <th>Hotel</th>
               <th>No PO</th>
               <th>No Faktur</th>
               <th class="num">Jml Item</th>
               <th class="num">Sub Total</th>
             </tr>
           </thead>
           <tbody>${body}</tbody>
           <tfoot>
             <tr>
               <td colspan="4"><strong>TOTAL KESELURUHAN :</strong></td>
               <td class="num">${totalQtyAll.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
               <td class="num">${escapeHtml(formatIdr(String(pdfGrandTotal)))}</td>
             </tr>
           </tfoot>
         </table>
         <div class="summary-block">
           <table class="summary-table">
             <tr><td class="label">Jumlah Item</td><td class="label">:</td><td class="val">${totalQtyAll.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td></tr>
             <tr><td class="label">Sub Total</td><td class="label">:</td><td class="val">${escapeHtml(formatIdr(String(pdfGrandTotal)))}</td></tr>
           </table>
         </div>`,
      );
    } finally {
      setIsPrinting(false);
    }
  }, [mode, groupedRows, from, to, groupBy, hotelLabel, grandTotal, hotelId]);

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          {groupBy === "none" ? (
            <div className="space-y-2">
              <Label>Status PO</Label>
              <Select
                value={poFilter}
                onValueChange={(v) => {
                  setPoFilter((v ?? "all") as PoFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PO_FILTER_LABELS) as PoFilter[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PO_FILTER_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <ReportResetButton
          onReset={() => {
            setPreset("month");
            setCustomFrom(anchor);
            setCustomTo(anchor);
            setHotelId("");
            setGroupBy("none");
            setPoFilter("all");
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
          onPrintPdf={() => void printPdf()}
          disabled={!hasData || query.isLoading || isPrinting}
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
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>No PO</TableHead>
                  <TableHead>No Faktur</TableHead>
                  <TableHead className="text-right">Jml Item</TableHead>
                  <TableHead className="text-right">Sub Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.saleDate)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-primary">{r.hotel.code}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{r.hotel.name}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPoNumber(r.poNumber)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.transactionCode}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.totalQty).toLocaleString("id-ID", { minimumFractionDigits: 2 })}
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
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
