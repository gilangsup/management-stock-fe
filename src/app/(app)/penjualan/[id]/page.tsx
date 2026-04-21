"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackNarrow } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  type SalesInvoiceDetail,
  salesLineProductName,
  salesLineUnitPrice,
} from "@/types/sales";

export default function PenjualanDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["sales-transaction-detail", id],
    queryFn: async () => {
      const { data: res } = await api.get<{ data: SalesInvoiceDetail }>(
        `/sales-transactions/${id}`,
      );
      return res.data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className={cn(pageStackNarrow, "py-12 text-center text-muted-foreground")}>
          Memuat…
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <AppShell>
        <div className={cn(pageStackNarrow, "space-y-4 py-8")}>
          <p className="text-muted-foreground">
            {notFound
              ? "Faktur penjualan tidak ditemukan."
              : "Tidak dapat memuat detail. Pastikan "}
            {!notFound ? (
              <>
                <code className="rounded bg-muted px-1 text-xs">GET /api/sales-transactions/:id</code>{" "}
                tersedia.
              </>
            ) : null}
          </p>
          <Link
            href="/penjualan"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            Kembali ke list
          </Link>
        </div>
      </AppShell>
    );
  }

  const d = data;

  return (
    <AppShell searchPlaceholder="…">
      <div className={pageStackNarrow}>
        <PageHeader
          title={`Faktur ${d.transactionCode}`}
          description="Detail penjualan barang jadi ke hotel — cetak Bon dari tombol di bawah."
        >
          <Link
            href="/penjualan"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex items-center",
            )}
          >
            <ArrowLeft className="mr-2 size-4" />
            List penjualan
          </Link>
          <Link
            href={`/penjualan/${id}/bon`}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ size: "sm" }),
              "btn-gradient border-0 inline-flex items-center",
            )}
          >
            <Printer className="mr-2 size-4" />
            Cetak Bon
          </Link>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hotel</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Nama</span>
                <span className="text-right font-medium">{d.hotelName}</span>
              </div>
              {d.hotelCode ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Kode PL</span>
                  <span className="font-mono">{d.hotelCode}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tanggal penjualan</span>
                <span>{formatDate(d.saleDate)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Grand total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{formatIdr(d.grandTotal)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Dihitung server dari qty × harga jual per baris.
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Rincian barang</h2>
          <div className="surface-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga / unit</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.lines ?? []).map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{line.itemCode}</TableCell>
                    <TableCell className="font-medium">{salesLineProductName(line)}</TableCell>
                    <TableCell>
                      {line.unit.name}{" "}
                      <span className="text-xs text-muted-foreground">({line.unit.code})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{line.qty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIdr(salesLineUnitPrice(line))}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIdr(line.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
                {!d.lines?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Tidak ada baris.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
