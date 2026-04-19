"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Eye, Plus, Store } from "lucide-react";
import { DateField } from "@/components/forms/date-field";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SalesTransactionFormDialog } from "@/components/sales/sales-transaction-form-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { formatDate, formatIdr } from "@/lib/format";
import { labelForHotelValue } from "@/lib/select-labels";
import type { SalesInvoiceListItem, SalesListMeta } from "@/types/sales";
import { cn } from "@/lib/utils";

type Hotel = { id: string; name: string };

const FILTER_ALL = "__all__";
const PAGE_SIZE = 20;

export default function PenjualanListPage() {
  const router = useRouter();
  const [hotelFilter, setHotelFilter] = useState(FILTER_ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
    staleTime: 60_000,
  });

  const list = useQuery({
    queryKey: ["sales-transactions", page, hotelFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (hotelFilter !== FILTER_ALL) params.hotelId = hotelFilter;
      if (dateFrom.trim()) params.from = dateFrom.trim();
      if (dateTo.trim()) params.to = dateTo.trim();

      const { data } = await api.get<{
        data: SalesInvoiceListItem[];
        meta?: Partial<SalesListMeta>;
      }>("/sales-transactions", { params });
      return {
        rows: data.data,
        meta: data.meta,
      };
    },
  });

  const rows = list.data?.rows ?? [];
  const total = list.data?.meta?.total;
  const hasNext = rows.length === PAGE_SIZE;
  const hasPrev = page > 1;

  const hotelLabel = useMemo(() => {
    if (hotelFilter === FILTER_ALL) return null;
    return labelForHotelValue(hotels.data, hotelFilter);
  }, [hotelFilter, hotels.data]);

  return (
    <AppShell searchPlaceholder="Cari kode transaksi…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="List Penjualan"
          description="Faktur penjualan barang jadi ke hotel — harga dari master per hotel, tanpa pajak/diskon."
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Hotel</p>
              <Select
                value={hotelFilter}
                onValueChange={(v) => {
                  setHotelFilter(v ?? FILTER_ALL);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full min-w-[200px]">
                  <SelectValue placeholder="Filter hotel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL}>Semua hotel</SelectItem>
                  {(hotels.data ?? []).map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Dari tanggal</p>
              <DateField
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                  setPage(1);
                }}
                placeholder="Semua"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Sampai tanggal</p>
              <DateField
                value={dateTo}
                onChange={(v) => {
                  setDateTo(v);
                  setPage(1);
                }}
                placeholder="Semua"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-6 lg:mt-0"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setHotelFilter(FILTER_ALL);
                  setPage(1);
                }}
              >
                Reset filter
              </Button>
            </div>
          </div>
          <Button type="button" className="btn-gradient border-0" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 size-4" />
            Tambah transaksi
          </Button>
        </div>

        {hotelFilter !== FILTER_ALL && hotelLabel ? (
          <p className="text-xs text-muted-foreground">
            Filter hotel aktif: <strong>{hotelLabel}</strong>
          </p>
        ) : null}

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode faktur</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : list.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                    Tidak dapat memuat faktur. Pastikan{" "}
                    <code className="rounded bg-muted px-1 text-xs">GET /api/sales-transactions</code>{" "}
                    tersedia.
                  </TableCell>
                </TableRow>
              ) : !rows.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                    Belum ada faktur penjualan.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm font-medium text-primary">
                      {row.transactionCode}
                    </TableCell>
                    <TableCell>{formatDate(row.saleDate)}</TableCell>
                    <TableCell>
                      <span className="font-medium">{row.hotelName}</span>
                      {row.hotelCode ? (
                        <span className="ml-1 text-xs text-muted-foreground">({row.hotelCode})</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIdr(row.grandTotal)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/penjualan/${row.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                        )}
                      >
                        <Eye className="mr-1 size-3.5" />
                        Detail
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!list.isLoading && !list.isError && rows.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Halaman {page}
              {typeof total === "number" ? ` — ${total} faktur` : null}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        ) : null}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Store className="size-3.5 shrink-0" />
          API:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">GET /api/sales-transactions</code>{" "}
          (query: <code className="text-[11px]">hotelId</code>, <code className="text-[11px]">from</code>,{" "}
          <code className="text-[11px]">to</code>, <code className="text-[11px]">page</code>,{" "}
          <code className="text-[11px]">limit</code>)
        </p>
      </div>

      <SalesTransactionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={(invoiceId) => router.push(`/penjualan/${invoiceId}`)}
      />
    </AppShell>
  );
}
