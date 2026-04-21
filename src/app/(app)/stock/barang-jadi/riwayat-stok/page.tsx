"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ApiListResponse, FinishedProductStockMovementRow } from "@/components/inventory/types";
import { api } from "@/lib/api";
import { formatDate, formatIntegerQty } from "@/lib/format";

const PAGE_SIZE = 15;

function formatDateTimeId(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function eventDateLabel(row: FinishedProductStockMovementRow): string {
  if (row.direction === "in" && row.productionDate) return formatDate(row.productionDate);
  if (row.direction === "out" && row.pickupDate) return formatDate(row.pickupDate);
  return "—";
}

export default function RiwayatStokBarangJadiPage() {
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<"" | "in" | "out">("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [eventDateFrom, setEventDateFrom] = useState("");
  const [eventDateTo, setEventDateTo] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [direction, debouncedSearch, eventDateFrom, eventDateTo]);

  const list = useQuery({
    queryKey: [
      "finished-product-stock-movements",
      page,
      direction,
      debouncedSearch,
      eventDateFrom,
      eventDateTo,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (direction) params.direction = direction;
      if (debouncedSearch) params.search = debouncedSearch;
      if (eventDateFrom) params.eventDateFrom = eventDateFrom;
      if (eventDateTo) params.eventDateTo = eventDateTo;
      const { data } = await api.get<ApiListResponse<FinishedProductStockMovementRow>>(
        "/finished-products/stock-movements",
        { params },
      );
      return data;
    },
  });

  const total = list.data?.meta.total ?? 0;
  const limit = list.data?.meta.limit ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <PageHeader
        title="Riwayat stok barang jadi"
        description="Riwayat stok masuk dan keluar. Tanggal kejadian = tanggal pembuatan (masuk) atau tanggal pengambilan (keluar)."
      />

      <div className="surface-panel space-y-4 rounded-2xl border border-border p-4">
        <Tabs
          value={direction === "" ? "all" : direction}
          onValueChange={(v) => setDirection(v === "all" ? "" : (v as "in" | "out"))}
          className="w-full"
        >
          <TabsList variant="pill" className="w-full justify-start">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="in">Masuk</TabsTrigger>
            <TabsTrigger value="out">Keluar</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Cari nama / kode barang</Label>
            <Input
              placeholder="Mis. risol, SM001…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal kejadian dari</Label>
            <DateField value={eventDateFrom} onChange={setEventDateFrom} placeholder="Opsional" />
          </div>
          <div className="space-y-2">
            <Label>Tanggal kejadian sampai</Label>
            <DateField value={eventDateTo} onChange={setEventDateTo} placeholder="Opsional" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setDebouncedSearch("");
              setEventDateFrom("");
              setEventDateTo("");
              setDirection("");
            }}
          >
            Reset filter
          </Button>
        </div>
      </div>

      <div className="surface-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal kejadian</TableHead>
              <TableHead>Arah</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Dicatat</TableHead>
              <TableHead className="text-right">Stok SKU*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data?.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-sm">{eventDateLabel(row)}</TableCell>
                <TableCell>
                  <Badge variant={row.direction === "in" ? "default" : "secondary"}>
                    {row.direction === "in" ? "Masuk" : "Keluar"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.finishedProduct.name}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {row.finishedProduct.itemCode}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatIntegerQty(row.quantity)}
                </TableCell>
                <TableCell className="text-sm">{row.picName}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTimeId(row.createdAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatIntegerQty(row.finishedProduct.stockQuantity)}
                </TableCell>
              </TableRow>
            ))}
            {!list.data?.data?.length && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {list.isLoading ? "Memuat…" : "Belum ada riwayat untuk filter ini."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <p className="border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          *Stok SKU = nilai master saat ini (bukan stok pada saat transaksi).
        </p>
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total}
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
      </div>
    </>
  );
}
