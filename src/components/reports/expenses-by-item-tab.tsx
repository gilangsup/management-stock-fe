"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Loader2, ShoppingCart, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { escapeHtml, printHtmlDocument } from "@/lib/export-utils";
import { formatDate, formatIdr } from "@/lib/format";
import { APP_NAME, COMPANY_ADDRESS, COMPANY_PHONES } from "@/lib/brand";
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

export function ExpensesByItemTab() {
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [preset, setPreset] = useState<DatePreset>("month");
  const [customFrom, setCustomFrom] = useState(anchor);
  const [customTo, setCustomTo] = useState(anchor);
  const [filterMaterialId, setFilterMaterialId] = useState("");
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

  const allRows = query.data?.data ?? [];

  // Filtered rows berdasarkan bahan baku yang dipilih
  const rows = useMemo(
    () =>
      filterMaterialId
        ? allRows.filter((r) => r.rawMaterialId === filterMaterialId)
        : allRows,
    [allRows, filterMaterialId],
  );

  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + Number(r.totalAmount), 0),
    [rows],
  );

  const filterLabel = filterMaterialId
    ? (allRows.find((r) => r.rawMaterialId === filterMaterialId)?.name ?? filterMaterialId)
    : "Semua bahan baku";

  const printPdf = useCallback(() => {
    const totalQtyAll = rows.reduce((s, r) => s + Number(r.totalQty), 0);
    const body = rows
      .map(
        (r, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)} <small style="color:#666">${escapeHtml(r.itemCode)}</small></td>
            <td>${escapeHtml(r.unit.code)}</td>
            <td class="num">${r.lineCount}</td>
            <td class="num">${Number(r.totalQty).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
            <td class="num">${escapeHtml(formatIdr(r.totalAmount))}</td>
          </tr>`,
      )
      .join("");
    printHtmlDocument(
      `Belanja per item ${from}–${to}`,
      `<style>${rekapStyles}</style>
       <div class="report-header">
         <div class="company-block">
           <p class="report-title">LAPORAN BELANJA PER ITEM</p>
           <p class="company-name">${escapeHtml(APP_NAME)}</p>
           <p class="company-detail">${escapeHtml(COMPANY_ADDRESS)}</p>
           <p class="company-detail">${escapeHtml(COMPANY_PHONES)}</p>
         </div>
         <div class="periode-block">
           <p><strong>PERIODE :</strong> ${escapeHtml(formatDate(from))} – ${escapeHtml(formatDate(to))}</p>
           <p>Bahan baku : ${escapeHtml(filterLabel)}</p>
         </div>
       </div>
       <table>
         <thead>
           <tr>
             <th>#</th>
             <th>Bahan Baku</th>
             <th>Satuan</th>
             <th class="num">Transaksi</th>
             <th class="num">Total Qty</th>
             <th class="num">Total Belanja</th>
           </tr>
         </thead>
         <tbody>${body}</tbody>
         <tfoot>
           <tr>
             <td colspan="4"><strong>TOTAL KESELURUHAN :</strong></td>
             <td class="num">${totalQtyAll.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
             <td class="num">${escapeHtml(formatIdr(grandTotal))}</td>
           </tr>
         </tfoot>
       </table>
       <div class="summary-block">
         <table class="summary-table">
           <tr><td class="label">Total Qty</td><td class="label">:</td><td class="val">${totalQtyAll.toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td></tr>
           <tr><td class="label">Total Belanja</td><td class="label">:</td><td class="val">${escapeHtml(formatIdr(grandTotal))}</td></tr>
         </table>
       </div>`,
    );
  }, [rows, from, to, grandTotal, filterLabel]);

  return (
    <div className="space-y-4">
      <div className="surface-panel space-y-4 rounded-2xl border border-border p-4">
        <ReportDateFilter
          preset={preset}
          onPresetChange={(p) => {
            setPreset(p);
            setFilterMaterialId("");
          }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={(v) => {
            setCustomFrom(v);
            setFilterMaterialId("");
          }}
          onCustomToChange={(v) => {
            setCustomTo(v);
            setFilterMaterialId("");
          }}
        />

        {/* Filter bahan baku */}
        <div className="space-y-2">
          <Label>Filter bahan baku</Label>
          <div className="flex items-center gap-2">
            <Select
              value={filterMaterialId || "__all__"}
              onValueChange={(v) => setFilterMaterialId(!v || v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue>
                  {filterMaterialId
                    ? (allRows.find((r) => r.rawMaterialId === filterMaterialId)?.name ?? filterMaterialId)
                    : "Semua bahan baku"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">Semua bahan baku</SelectItem>
                {allRows.map((r) => (
                  <SelectItem key={r.rawMaterialId} value={r.rawMaterialId}>
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{r.itemCode}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterMaterialId && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setFilterMaterialId("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          {filterMaterialId && (
            <p className="text-xs text-muted-foreground">
              Menampilkan akumulasi untuk <strong>{filterLabel}</strong> saja.
            </p>
          )}
        </div>

        <ReportResetButton
          onReset={() => {
            setPreset("month");
            setCustomFrom(anchor);
            setCustomTo(anchor);
            setFilterMaterialId("");
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatCard label="Total belanja" icon={ShoppingCart} tone="emerald" className="min-w-[200px]">
          {formatIdr(String(grandTotal))}
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
