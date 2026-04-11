"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const recvStatusLabel: Record<string, string> = {
  paid: "Lunas",
  partial: "Sebagian",
  open: "Belum lunas",
};

type Recv = {
  id: string;
  invoiceExchangeId: string;
  hotelName: string;
  receiptNumber: string;
  exchangeDate: string;
  totalAmount: string;
  paidAmount: string;
  outstanding: string;
  status: string;
};

export default function ReceivablesPage() {
  const qc = useQueryClient();
  const [payOpen, setPayOpen] = useState(false);
  const [selected, setSelected] = useState<Recv | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const list = useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Recv[] }>("/receivables");
      return data.data;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.post(`/receivables/${selected.id}/payments`, {
        amount: Number(amount),
        paymentDate,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Pembayaran dicatat");
      setPayOpen(false);
      setSelected(null);
      setAmount("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["receivables"] });
    },
    onError: () => toast.error("Gagal menyimpan pembayaran"),
  });

  return (
    <AppShell searchPlaceholder="Cari piutang…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Piutang"
          description="Piutang otomatis dari total kwitansi penukaran faktur — catat pembayaran di sini."
        />

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Kwitansi</TableHead>
                <TableHead>Tanggal tukar</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Dibayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                    {row.hotelName}
                  </TableCell>
                  <TableCell>{row.receiptNumber}</TableCell>
                  <TableCell>{formatDate(row.exchangeDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIdr(row.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIdr(row.paidAmount)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                    {formatIdr(row.outstanding)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "paid"
                          ? "success"
                          : row.status === "partial"
                            ? "warning"
                            : "info"
                      }
                    >
                      {recvStatusLabel[row.status] ?? row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.status !== "paid" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="border-indigo-200 bg-white hover:bg-indigo-50 dark:border-indigo-500/40 dark:bg-transparent"
                        variant="outline"
                        onClick={() => {
                          setSelected(row);
                          setAmount(row.outstanding);
                          setPaymentDate(new Date().toISOString().slice(0, 10));
                          setPayOpen(true);
                        }}
                      >
                        Bayar
                      </Button>
                    ) : (
                      <Link
                        href={`/invoice-exchange/${row.invoiceExchangeId}/receipt`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-950/50",
                        )}
                      >
                        Lihat
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Belum ada piutang. Buat penukaran faktur terlebih dahulu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat pembayaran</DialogTitle>
            {selected ? (
              <p className="text-sm text-muted-foreground">
                {selected.hotelName} · sisa {formatIdr(selected.outstanding)}
              </p>
            ) : null}
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Jumlah dibayar</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal pembayaran</Label>
              <DateField value={paymentDate} onChange={setPaymentDate} />
            </div>
            <div className="space-y-2">
              <Label>Catatan (opsional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={pay.isPending || !selected || Number(amount) <= 0}
              onClick={() => pay.mutate()}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
