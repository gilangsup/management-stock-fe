"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { CheckSquare2, Loader2, Pencil, Plus, Printer, Square, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { api } from "@/lib/api";
import { formatDate, formatIdr, terbilang } from "@/lib/format";
import { labelForHotelValue } from "@/lib/select-labels";
import { cn } from "@/lib/utils";
import type { SalesInvoiceDetail, SalesInvoiceListItem } from "@/types/sales";
import { salesLineProductName } from "@/types/sales";

type Hotel = { id: string; name: string };
type Line = { description: string; amount: string };
type ExchangeRow = {
  id: string;
  hotelName: string;
  exchangeDate: string;
  receiptNumber: string;
  totalAmount: string;
};
type ExchangeDetail = {
  id: string;
  hotelId: string;
  hotelName: string;
  exchangeDate: string;
  receiptNumber: string;
  notes: string | null;
  lines: { id: string; description: string; amount: string }[];
  linkedTransactionIds: string[];
  totalAmount: string;
};

export default function InvoiceExchangePage() {
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter state
  const [filterHotelId, setFilterHotelId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const hasFilter = !!(filterHotelId || filterDateFrom || filterDateTo);

  // Form dialog state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Sales transaction multi-selection (create mode only)
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);
  // Cache: txnId → lines derived from that transaction
  const [txnLinesCache, setTxnLinesCache] = useState<Record<string, Line[]>>({});
  const [loadingTxnIds, setLoadingTxnIds] = useState<Set<string>>(new Set());
  // Lines added manually by user on top of auto-filled transaction lines
  const [manualLines, setManualLines] = useState<Line[]>([]);

  // Form fields
  const [hotelId, setHotelId] = useState<string>("");
  const [exchangeDate, setExchangeDate] = useState(today);
  const [notes, setNotes] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRow | null>(null);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
  });

  // Fetch daftar transaksi penjualan untuk hotel yang dipilih (create & edit mode)
  const salesTransactions = useQuery({
    queryKey: ["sales-transactions-for-exchange", hotelId],
    queryFn: async () => {
      const { data } = await api.get<{ data: SalesInvoiceListItem[] }>("/sales-transactions", {
        params: { limit: 500, page: 1, hotelId },
      });
      return data.data;
    },
    enabled: open && !!hotelId,
    staleTime: 30_000,
  });

  // Computed: auto-lines dari semua transaksi yang dipilih
  const autoLines = useMemo<Line[]>(
    () =>
      selectedTxnIds.flatMap(
        (id) =>
          txnLinesCache[id] ?? [],
      ),
    [selectedTxnIds, txnLinesCache],
  );

  // Total semua lines (auto + manual)
  const lines = useMemo<Line[]>(
    () => [...autoLines, ...manualLines],
    [autoLines, manualLines],
  );

  const list = useQuery({
    queryKey: ["invoice-exchanges", filterHotelId, filterDateFrom, filterDateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterHotelId) params.set("hotelId", filterHotelId);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const qs = params.toString();
      const { data } = await api.get<{ data: ExchangeRow[] }>(
        `/invoice-exchanges${qs ? `?${qs}` : ""}`,
      );
      return data.data;
    },
  });

  const editQuery = useQuery({
    queryKey: ["invoice-exchange-detail", editId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ExchangeDetail }>(`/invoice-exchanges/${editId}`);
      return data.data;
    },
    enabled: !!editId,
  });

  // Pre-fetch lines untuk daftar transaksi yang sudah terhubung (untuk edit mode)
  const prefetchTransactionLines = useCallback(
    async (txnIds: string[]) => {
      for (const txnId of txnIds) {
        if (txnLinesCache[txnId]) continue;
        setLoadingTxnIds((s) => new Set(s).add(txnId));
        try {
          const { data } = await api.get<{ data: SalesInvoiceDetail }>(
            `/sales-transactions/${txnId}`,
          );
          const detail = data.data;
          const newLines: Line[] = detail.lines.map((l) => ({
            description: `${salesLineProductName(l)} (${Number(l.qty)} ${l.unit.code})`,
            amount: String(Number(l.lineTotal)),
          }));
          setTxnLinesCache((c) => ({ ...c, [txnId]: newLines }));
        } catch {
          // silently ignore pre-fetch errors
        } finally {
          setLoadingTxnIds((s) => {
            const next = new Set(s);
            next.delete(txnId);
            return next;
          });
        }
      }
    },
    [txnLinesCache],
  );

  useEffect(() => {
    if (editId && editQuery.data) {
      const d = editQuery.data;
      setHotelId(d.hotelId);
      setExchangeDate(d.exchangeDate);
      setNotes(d.notes ?? "");
      setManualLines([]);
      // Pre-check transaksi yang pernah terhubung
      const linkedIds = d.linkedTransactionIds ?? [];
      setSelectedTxnIds(linkedIds);
      if (linkedIds.length > 0) void prefetchTransactionLines(linkedIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, editQuery.data]);

  const toggleTransaction = useCallback(
    async (txnId: string) => {
      const isSelected = selectedTxnIds.includes(txnId);

      if (isSelected) {
        // Deselect: hapus dari daftar dan cache
        setSelectedTxnIds((ids) => ids.filter((id) => id !== txnId));
        setTxnLinesCache((c) => {
          const next = { ...c };
          delete next[txnId];
          return next;
        });
        return;
      }

      // Select: fetch detail jika belum di-cache
      if (!txnLinesCache[txnId]) {
        setLoadingTxnIds((s) => new Set(s).add(txnId));
        try {
          const { data } = await api.get<{ data: SalesInvoiceDetail }>(
            `/sales-transactions/${txnId}`,
          );
          const detail = data.data;
          const newLines: Line[] = detail.lines.map((l) => ({
            description: `${salesLineProductName(l)} (${Number(l.qty)} ${l.unit.code})`,
            amount: String(Number(l.lineTotal)),
          }));
          setTxnLinesCache((c) => ({ ...c, [txnId]: newLines }));
          // Set tanggal dari transaksi pertama yang dipilih
          if (selectedTxnIds.length === 0) {
            setExchangeDate(detail.saleDate);
          }
        } catch {
          toast.error("Gagal memuat detail transaksi");
          setLoadingTxnIds((s) => {
            const next = new Set(s);
            next.delete(txnId);
            return next;
          });
          return;
        } finally {
          setLoadingTxnIds((s) => {
            const next = new Set(s);
            next.delete(txnId);
            return next;
          });
        }
      }

      setSelectedTxnIds((ids) => [...ids, txnId]);
    },
    [selectedTxnIds, txnLinesCache],
  );

  function onCreateHotelChange(v: string) {
    setHotelId(v);
    // Reset transaksi ketika hotel berubah
    setSelectedTxnIds([]);
    setTxnLinesCache({});
    setManualLines([]);
    setExchangeDate(today);
  }

  function openCreate() {
    setEditId(null);
    setSelectedTxnIds([]);
    setTxnLinesCache({});
    setManualLines([]);
    setHotelId("");
    setExchangeDate(today);
    setNotes("");
    setOpen(true);
  }

  function openEdit(row: ExchangeRow) {
    setEditId(row.id);
    setSelectedTxnIds([]);
    setTxnLinesCache({});
    setManualLines([]);
    setHotelId("");
    setExchangeDate(today);
    setNotes("");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditId(null);
    setSelectedTxnIds([]);
    setTxnLinesCache({});
    setManualLines([]);
  }

  function handleManualAmountChange(i: number, v: string) {
    setManualLines((ls) =>
      ls.map((x, j) => {
        if (j !== i) return x;
        const prevTerbilang = x.amount ? terbilang(x.amount) : "";
        const shouldAutoFill = !x.description || x.description === prevTerbilang;
        const newDescription = shouldAutoFill ? terbilang(v) : x.description;
        return { ...x, amount: v, description: newDescription };
      }),
    );
  }

  const validLines = lines.filter((l) => l.description.trim() && Number(l.amount) > 0);
  const isCreateMode = !editId;
  const canSubmitCreate = selectedTxnIds.length > 0 && !!hotelId && validLines.length > 0;
  const canSubmitEdit = !!hotelId && selectedTxnIds.length > 0;
  const canSubmit = isCreateMode ? canSubmitCreate : canSubmitEdit;

  const createExchange = useMutation({
    mutationFn: async () => {
      const payload = {
        hotelId,
        exchangeDate,
        notes: notes || undefined,
        lines: validLines.map((l) => ({ description: l.description.trim(), amount: Number(l.amount) })),
        transactionIds: selectedTxnIds.length > 0 ? selectedTxnIds : undefined,
      };
      await api.post("/invoice-exchanges", payload);
    },
    onSuccess: () => {
      toast.success("Penukaran faktur tersimpan — piutang otomatis dibuat");
      closeDialog();
      qc.invalidateQueries({ queryKey: ["invoice-exchanges"], exact: false });
      qc.invalidateQueries({ queryKey: ["receivables"] });
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const updateExchange = useMutation({
    mutationFn: async () => {
      const payload = {
        hotelId,
        exchangeDate,
        transactionIds: selectedTxnIds,
      };
      await api.put(`/invoice-exchanges/${editId}`, payload);
    },
    onSuccess: () => {
      toast.success("Penukaran faktur berhasil diperbarui");
      closeDialog();
      qc.invalidateQueries({ queryKey: ["invoice-exchanges"], exact: false });
      qc.invalidateQueries({ queryKey: ["invoice-exchange-detail", editId] });
      qc.invalidateQueries({ queryKey: ["receivables"] });
    },
    onError: () => toast.error("Gagal memperbarui"),
  });

  const deleteExchange = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invoice-exchanges/${id}`);
    },
    onSuccess: () => {
      toast.success("Penukaran faktur berhasil dihapus");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["invoice-exchanges"], exact: false });
      qc.invalidateQueries({ queryKey: ["receivables"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Gagal menghapus";
      toast.error(msg);
      setDeleteTarget(null);
    },
  });

  const isSaving = createExchange.isPending || updateExchange.isPending;
  const formReady = !editId || !editQuery.isLoading;

  return (
    <AppShell searchPlaceholder="Cari faktur…">
      <div className={pageStackWide}>
        <PageHeader
          title="Penukaran faktur"
          description="Penukaran faktur per hotel — cetak kwitansi dari total baris."
        >
          <Button type="button" className="btn-gradient border-0" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Buat penukaran
          </Button>
        </PageHeader>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <div className="min-w-[180px] flex-1 space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Hotel</span>
            <Select
              value={filterHotelId || "__all__"}
              onValueChange={(v) => setFilterHotelId(!v || v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue>
                  {filterHotelId
                    ? (labelForHotelValue(hotels.data, filterHotelId) ?? filterHotelId)
                    : "Semua hotel"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua hotel</SelectItem>
                {(hotels.data ?? []).map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px] space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Dari tanggal</span>
            <div className="flex items-center gap-1">
              <DateField
                value={filterDateFrom}
                onChange={setFilterDateFrom}
                placeholder="Pilih tanggal"
                className="h-9 flex-1 bg-background"
              />
              {filterDateFrom && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFilterDateFrom("")}>
                  <X className="size-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="min-w-[150px] space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Sampai tanggal</span>
            <div className="flex items-center gap-1">
              <DateField
                value={filterDateTo}
                onChange={setFilterDateTo}
                placeholder="Pilih tanggal"
                className="h-9 flex-1 bg-background"
              />
              {filterDateTo && (
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFilterDateTo("")}>
                  <X className="size-3" />
                </Button>
              )}
            </div>
          </div>

          {hasFilter && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 self-end"
              onClick={() => { setFilterHotelId(""); setFilterDateFrom(""); setFilterDateTo(""); }}
            >
              <X className="mr-1 size-3" />
              Reset filter
            </Button>
          )}
        </div>

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. kwitansi</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                    {row.hotelName}
                  </TableCell>
                  <TableCell>{formatDate(row.exchangeDate)}</TableCell>
                  <TableCell>{row.receiptNumber}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatIdr(row.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/invoice-exchange/${row.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                        )}
                      >
                        <Printer className="mr-1 size-3" />
                        Kwitansi
                      </Link>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(row)} title="Edit">
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                        onClick={() => setDeleteTarget(row)}
                        title="Hapus"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Belum ada penukaran.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit penukaran faktur" : "Penukaran faktur"}</DialogTitle>
          </DialogHeader>

          {editId && editQuery.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Memuat data…</div>
          ) : (
            <div className="grid gap-4 py-2">
              {/* ── Create mode: hotel dulu, lalu transaksi ── */}
              {!editId && (
                <>
                  {/* Step 1: Pilih hotel */}
                  <div className="space-y-2">
                    <Label>
                      Hotel <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={hotelId || undefined}
                      onValueChange={(v) => v && onCreateHotelChange(v)}
                    >
                      <SelectTrigger className={!hotelId ? "border-dashed" : ""}>
                        <SelectValue placeholder="Pilih hotel…">
                          {(val) => labelForHotelValue(hotels.data, val) ?? undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(hotels.data ?? []).map((h) => (
                          <SelectItem key={h.id} value={String(h.id)}>
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Pilih transaksi (muncul setelah hotel dipilih) — multi-select */}
                  {hotelId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          Transaksi penjualan <span className="text-destructive">*</span>
                        </Label>
                        {selectedTxnIds.length > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {selectedTxnIds.length} dipilih
                          </span>
                        )}
                      </div>
                      {salesTransactions.isLoading ? (
                        <p className="text-sm text-muted-foreground">Memuat transaksi…</p>
                      ) : !salesTransactions.data?.length ? (
                        <p className="rounded border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
                          Tidak ada transaksi untuk hotel ini.
                        </p>
                      ) : (
                        <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                          {(salesTransactions.data ?? []).map((t) => {
                            const checked = selectedTxnIds.includes(t.id);
                            const loading = loadingTxnIds.has(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                                onClick={() => toggleTransaction(t.id)}
                                disabled={loading}
                              >
                                {loading ? (
                                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                                ) : checked ? (
                                  <CheckSquare2 className="size-4 shrink-0 text-primary" />
                                ) : (
                                  <Square className="size-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="font-mono text-xs font-semibold text-primary">
                                  {t.transactionCode}
                                </span>
                                <span className="flex-1 text-xs text-muted-foreground">
                                  {formatDate(t.saleDate)}
                                </span>
                                <span className="text-xs font-medium tabular-nums">
                                  {formatIdr(t.grandTotal)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {selectedTxnIds.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Centang satu atau lebih transaksi. Baris nominal akan terisi otomatis.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Edit mode: hotel (read-only) + transaksi checklist ── */}
              {!!editId && formReady && (
                <>
                  <div className="space-y-2">
                    <Label>Hotel</Label>
                    <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium">
                      {labelForHotelValue(hotels.data, hotelId) ?? hotelId}
                    </div>
                  </div>

                  {/* Transaksi checklist — muncul setelah hotelId tersedia */}
                  {hotelId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          Transaksi penjualan <span className="text-destructive">*</span>
                        </Label>
                        {selectedTxnIds.length > 0 && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {selectedTxnIds.length} dipilih
                          </span>
                        )}
                      </div>
                      {salesTransactions.isLoading ? (
                        <p className="text-sm text-muted-foreground">Memuat transaksi…</p>
                      ) : !salesTransactions.data?.length ? (
                        <p className="rounded border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
                          Tidak ada transaksi untuk hotel ini.
                        </p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                          {(salesTransactions.data ?? []).map((t) => {
                            const checked = selectedTxnIds.includes(t.id);
                            const loading = loadingTxnIds.has(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                                onClick={() => toggleTransaction(t.id)}
                                disabled={loading}
                              >
                                {loading ? (
                                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                                ) : checked ? (
                                  <CheckSquare2 className="size-4 shrink-0 text-primary" />
                                ) : (
                                  <Square className="size-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="font-mono text-xs font-semibold text-primary">
                                  {t.transactionCode}
                                </span>
                                <span className="flex-1 text-xs text-muted-foreground">
                                  {formatDate(t.saleDate)}
                                </span>
                                <span className="text-xs font-medium tabular-nums">
                                  {formatIdr(t.grandTotal)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {selectedTxnIds.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Pilih transaksi yang ingin disertakan dalam kwitansi ini.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Tanggal + rest of form (create: after ≥1 txn selected; edit: always) ── */}
              {(selectedTxnIds.length > 0 || !!editId) && formReady && (
                <>
                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <DateField value={exchangeDate} onChange={setExchangeDate} />
                  </div>

                  {/* Create mode: catatan + manual lines */}
                  {isCreateMode && (
                    <>
                      <div className="space-y-2">
                        <Label>Catatan (opsional)</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>

                      {/* Preview baris dari transaksi (auto) */}
                      {autoLines.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">
                            Baris dari transaksi terpilih ({autoLines.length} baris)
                          </Label>
                          <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border bg-muted/30 p-2">
                            {autoLines.map((line, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex-1 truncate text-muted-foreground">{line.description}</span>
                                <span className="shrink-0 tabular-nums font-medium">{formatIdr(line.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Baris manual tambahan */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Baris nominal tambahan</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setManualLines((ls) => [...ls, { description: "", amount: "" }])}
                          >
                            <Plus className="mr-1 size-3" />
                            Tambah baris
                          </Button>
                        </div>
                        {manualLines.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Opsional — tambah baris di luar transaksi jika diperlukan.
                          </p>
                    ) : (
                      <div className="space-y-2">
                        {manualLines.map((line, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              className="flex-1"
                              placeholder="Keterangan"
                              value={line.description}
                              onChange={(e) => {
                                const v = e.target.value;
                                setManualLines((ls) =>
                                  ls.map((x, j) => (j === i ? { ...x, description: v } : x)),
                                );
                              }}
                            />
                            <Input
                              className="w-32"
                              inputMode="decimal"
                              placeholder="Nominal"
                              value={line.amount}
                              onChange={(e) => handleManualAmountChange(i, e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setManualLines((ls) => ls.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total preview — create mode */}
                  {validLines.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold">
                      <span className="text-muted-foreground">Total kwitansi</span>
                      <span className="text-primary">
                        {formatIdr(
                          String(validLines.reduce((s, l) => s + Number(l.amount), 0)),
                        )}
                      </span>
                    </div>
                  )}
                    </>
                  )}

                  {/* Edit mode: preview total dari transaksi terpilih */}
                  {!!editId && autoLines.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm font-semibold">
                      <span className="text-muted-foreground">Total kwitansi</span>
                      <span className="text-primary">
                        {formatIdr(
                          String(autoLines.reduce((s, l) => s + Number(l.amount), 0)),
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={isSaving || !canSubmit || !formReady}
              onClick={() => (editId ? updateExchange.mutate() : createExchange.mutate())}
            >
              {editId ? "Simpan perubahan" : "Simpan & kwitansi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus penukaran faktur?</DialogTitle>
            <DialogDescription>
              Faktur <span className="font-semibold">{deleteTarget?.receiptNumber}</span> untuk hotel{" "}
              <span className="font-semibold">{deleteTarget?.hotelName}</span> akan dihapus permanen
              beserta piutang terkait. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteExchange.isPending}
              onClick={() => deleteTarget && deleteExchange.mutate(deleteTarget.id)}
            >
              {deleteExchange.isPending ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
