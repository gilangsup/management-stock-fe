"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Loader2, ShoppingCart } from "lucide-react";
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
  ReportResetButton,
  resolveDateRange,
  type DatePreset,
} from "@/components/reports/report-filters";

type ExpenseItemRow = {
  rawMaterialId: string;
  name: string;
  itemCode: string;
  unit: { code: string; name: string };
  lineCount: number;
  totalQty: string;
  totalAmount: string;
};

export function ExpensesByItemTab() {
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState(anchor);
  const [customTo, setCustomTo] = useState(anchor);
  const { from, to } = resolveDateRange(preset, customFrom, customTo);

  const query = useQuery({
    queryKey: ["reports", "expenses-by-item", from, to],
    queryFn: async () => {
      const { data } = await api.get<{ data: ExpenseItemRow[]; meta: { from: string; to: string } }>(
        "/reports/expenses-by-item",
        { params: { from, to } },
      );
      return data;
    },
  });

  const rows = query.data?.data ?? [];
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + Number(r.totalAmount), 0),
    [rows],
  );

  const printPdf = useCallback(() => {
    const body = rows
      .map(
        (r, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}<br><small>${escapeHtml(r.itemCode)}</small></td>
            <td>${escapeHtml(r.unit.code)}</td>
            <td class="text-right">${r.lineCount}</td>
            <td class="text-right">${Number(r.totalQty).toLocaleString("id-ID")}</td>
            <td class="text-right">${escapeHtml(formatIdr(r.totalAmount))}</td>
          </tr>`,
      )
      .join("");
    printHtmlDocument(
      `Belanja per item ${from}–${to}`,
      `<h1>Belanja Harian per Item</h1>
       <p class="meta">${escapeHtml(formatDate(from))} – ${escapeHtml(formatDate(to))}</p>
       <table>
         <thead><tr><th>#</th><th>Bahan</th><th>Satuan</th><th class="text-right">Transaksi</th><th class="text-right">Total Qty</th><th class="text-right">Total Belanja</th></tr></thead>
         <tbody>${body}</tbody>
         <tfoot><tr><td colspan="5" class="text-right">Grand total</td><td class="text-right">${escapeHtml(formatIdr(grandTotal))}</td></tr></tfoot>
       </table>`,
    );
  }, [rows, from, to, grandTotal]);

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
        <ReportResetButton
          onReset={() => {
            setPreset("month");
            setCustomFrom(anchor);
            setCustomTo(anchor);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatCard label="Total belanja" icon={ShoppingCart} tone="emerald" className="min-w-[200px]">
          {formatIdr(grandTotal)}
        </StatCard>
        <ReportExportActions
          exportPath="/reports/expenses-by-item/export"
          params={{ from, to }}
          onPrintPdf={printPdf}
          disabled={!rows.length || query.isLoading}
          label="belanja per item"
        />
      </div>

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Bahan baku</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Transaksi</TableHead>
              <TableHead className="text-right">Total qty</TableHead>
              <TableHead className="text-right">Total belanja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.rawMaterialId}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <span className="font-medium">{r.name}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {r.itemCode}
                  </span>
                </TableCell>
                <TableCell>{r.unit.code}</TableCell>
                <TableCell className="text-right tabular-nums">{r.lineCount}</TableCell>
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
                    "Tidak ada data belanja untuk periode ini."
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
