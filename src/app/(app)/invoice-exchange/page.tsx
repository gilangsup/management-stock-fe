"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, Plus, Printer, Trash2, X } from "lucide-react";
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

  // Sales transaction selection (create mode only)
  const [selectedSalesTxnId, setSelectedSalesTxnId] = useState<string>("");
  const [salesDetailLoading, setSalesDetailLoading] = useState(false);

  // Form fields
  const [hotelId, setHotelId] = useState<string>("");
  const [exchangeDate, setExchangeDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", amount: "" }]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRow | null>(null);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
  });

  const salesTransactions = useQuery({
    queryKey: ["sales-transactions-for-exchange"],
    queryFn: async () => {
      const { data } = await api.get<{ data: SalesInvoiceListItem[] }>("/sales-transactions", {
        params: { limit: 500, page: 1 },
      });
      return data.data;
    },
    enabled: open && !editId,
    staleTime: 30_000,
  });

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

  useEffect(() => {
    if (editId && editQuery.data) {
      setHotelId(editQuery.data.hotelId);
      setExchangeDate(editQuery.data.exchangeDate);
      setNotes(editQuery.data.notes ?? "");
      setLines(
        editQuery.data.lines.map((l) => ({
          description: l.description,
          amount: String(Number(l.amount)),
        })),
      );
    }
  }, [editId, editQuery.data]);

  async function onSalesTransactionSelect(txnId: string) {
    setSelectedSalesTxnId(txnId);
    if (!txnId) return;
    setSalesDetailLoading(true);
    try {
      const { data } = await api.get<{ data: SalesInvoiceDetail }>(
        `/sales-transactions/${txnId}`,
      );
      const detail = data.data;
      setHotelId(detail.hotelId);
      setExchangeDate(detail.saleDate);
      setNotes("");
      setLines(
        detail.lines.map((l) => ({
          description: `${salesLineProductName(l)} (${Number(l.qty)} ${l.unit.code})`,
          amount: String(Number(l.lineTotal)),
        })),
      );
    } catch {
      toast.error("Gagal memuat detail transaksi");
    } finally {
      setSalesDetailLoading(false);
    }
  }

  function openCreate() {
    setEditId(null);
    setSelectedSalesTxnId("");
    setHotelId("");
    setExchangeDate(today);
    setNotes("");
    setLines([{ description: "", amount: "" }]);
    setOpen(true);
  }

  function openEdit(row: ExchangeRow) {
    setEditId(row.id);
    setSelectedSalesTxnId("");
    setHotelId("");
    setExchangeDate(today);
    setNotes("");
    setLines([{ description: "", amount: "" }]);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditId(null);
    setSelectedSalesTxnId("");
  }

  function handleAmountChange(i: number, v: string) {
    setLines((ls) =>
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
  const canSubmitCreate = !!selectedSalesTxnId && !!hotelId && validLines.length > 0;
  const canSubmitEdit = !!hotelId && validLines.length > 0;
  const canSubmit = isCreateMode ? canSubmitCreate : canSubmitEdit;

  const createExchange = useMutation({
    mutationFn: async () => {
      const payload = {
        hotelId,
        exchangeDate,
        notes: notes || undefined,
        lines: validLines.map((l) => ({ description: l.description.trim(), amount: Number(l.amount) })),
      };
      const { data } = await api.post("/invoice-exchanges", payload);
      return data as { data: { id: string } };
    },
    onSuccess: (res) => {
      toast.success("Penukaran faktur tersimpan — piutang otomatis dibuat");
      closeDialog();
      qc.invalidateQueries({ queryKey: ["invoice-exchanges"], exact: false });
      qc.invalidateQueries({ queryKey: ["receivables"] });
      window.open(`/invoice-exchange/${res.data.id}/receipt`, "_blank", "noopener,noreferrer");
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const updateExchange = useMutation({
    mutationFn: async () => {
      const payload = {
        hotelId,
        exchangeDate,
        notes: notes || undefined,
        lines: validLines.map((l) => ({ description: l.description.trim(), amount: Number(l.amount) })),
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
              {/* Sales transaction picker — create mode only */}
              {!editId && (
                <div className="space-y-2">
                  <Label>
                    Transaksi penjualan <span className="text-destructive">*</span>
                  </Label>
                  {salesTransactions.isLoading ? (
                    <p className="text-sm text-muted-foreground">Memuat daftar transaksi…</p>
                  ) : (
                    <Select
                      value={selectedSalesTxnId || undefined}
                      onValueChange={(v) => v && onSalesTransactionSelect(v)}
                    >
                      <SelectTrigger className={!selectedSalesTxnId ? "border-dashed" : ""}>
                        <SelectValue placeholder="Pilih transaksi penjualan…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {(salesTransactions.data ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="font-mono text-xs text-primary">{t.transactionCode}</span>
                            <span className="ml-2 text-muted-foreground">
                              {t.hotelName} · {formatDate(t.saleDate)} · {formatIdr(t.grandTotal)}
                            </span>
                          </SelectItem>
                        ))}
                        {!salesTransactions.data?.length && (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Belum ada transaksi penjualan.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {!selectedSalesTxnId && (
                    <p className="text-xs text-muted-foreground">
                      Pilih transaksi penjualan untuk mengisi otomatis hotel, tanggal, dan baris nominal.
                    </p>
                  )}
                  {salesDetailLoading && (
                    <p className="text-xs text-primary">Memuat detail transaksi…</p>
                  )}
                </div>
              )}

              {/* Show rest of form after transaction is selected (create) or always in edit */}
              {(!!selectedSalesTxnId || !!editId) && formReady && (
                <>
                  <div className="space-y-2">
                    <Label>Hotel</Label>
                    {!editId ? (
                      <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                        {labelForHotelValue(hotels.data, hotelId) ?? hotelId}
                      </div>
                    ) : (
                      <Select
                        value={hotelId ? String(hotelId) : undefined}
                        onValueChange={(v) => setHotelId(v ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih hotel">
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
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal</Label>
                    <DateField value={exchangeDate} onChange={setExchangeDate} />
                  </div>

                  <div className="space-y-2">
                    <Label>Catatan (opsional)</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Baris nominal</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLines((ls) => [...ls, { description: "", amount: "" }])}
                      >
                        <Plus className="mr-1 size-3" />
                        Baris
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {lines.map((line, i) => (
                        <div key={i} className="flex gap-2">
                          <Input
                            className="flex-1"
                            placeholder="Keterangan"
                            value={line.description}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((ls) => ls.map((x, j) => (j === i ? { ...x, description: v } : x)));
                            }}
                          />
                          <Input
                            className="w-32"
                            inputMode="decimal"
                            placeholder="Nominal"
                            value={line.amount}
                            onChange={(e) => handleAmountChange(i, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={lines.length <= 1}
                            onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
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
