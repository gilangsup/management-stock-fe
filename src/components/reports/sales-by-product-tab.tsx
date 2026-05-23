"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Loader2, Package } from "lucide-react";
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
import { ReportExportActions } from "@/components/reports/report-export-actions";
import {
  ReportDateFilter,
  ReportHotelFilter,
  ReportResetButton,
  resolveDateRange,
  type DatePreset,
} from "@/components/reports/report-filters";

type Hotel = { id: string; name: string };

type SalesProductRow = {
  finishedProductId: string;
  itemCode: string;
  productName: string;
  unit: { code: string; name: string };
  invoiceCount: number;
  totalQty: string;
  totalAmount: string;
};

export function SalesByProductTab() {
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState(anchor);
  const [customTo, setCustomTo] = useState(anchor);
  const [hotelId, setHotelId] = useState("");
  const { from, to } = resolveDateRange(preset, customFrom, customTo);

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

  const rows = query.data ?? [];
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + Number(r.totalAmount), 0),
    [rows],
  );
  const hotelLabel = hotelId
    ? (hotels.data?.find((h) => h.id === hotelId)?.name ?? hotelId)
    : "Semua hotel";

  const printPdf = useCallback(() => {
    const body = rows
      .map(
        (r, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.productName)}<br><small>${escapeHtml(r.itemCode)}</small></td>
            <td>${escapeHtml(r.unit.code)}</td>
            <td class="text-right">${r.invoiceCount}</td>
            <td class="text-right">${Number(r.totalQty).toLocaleString("id-ID")}</td>
            <td class="text-right">${escapeHtml(formatIdr(r.totalAmount))}</td>
          </tr>`,
      )
      .join("");
    printHtmlDocument(
      `Penjualan per produk ${from}–${to}`,
      `<h1>Penjualan per Barang Jadi</h1>
       <p class="meta">${escapeHtml(formatDate(from))} – ${escapeHtml(formatDate(to))} · ${escapeHtml(hotelLabel)}</p>
       <table>
         <thead><tr><th>#</th><th>Produk</th><th>Satuan</th><th class="text-right">Faktur</th><th class="text-right">Total Qty</th><th class="text-right">Total Penjualan</th></tr></thead>
         <tbody>${body}</tbody>
         <tfoot><tr><td colspan="5" class="text-right">Grand total</td><td class="text-right">${escapeHtml(formatIdr(grandTotal))}</td></tr></tfoot>
       </table>`,
    );
  }, [rows, from, to, grandTotal, hotelLabel]);

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
          onPrintPdf={printPdf}
          disabled={!rows.length || query.isLoading}
          label="penjualan per produk"
        />
      </div>

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
