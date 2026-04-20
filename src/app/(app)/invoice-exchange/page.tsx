"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Printer, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackWide } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
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
import { cn } from "@/lib/utils";

type Hotel = { id: string; name: string };

type Line = { description: string; amount: string };

export default function InvoiceExchangePage() {
  const qc = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [open, setOpen] = useState(false);
  const [hotelId, setHotelId] = useState<string>("");
  const [exchangeDate, setExchangeDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", amount: "" }]);

  const hotels = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data } = await api.get<{ data: Hotel[] }>("/hotels");
      return data.data;
    },
  });

  const list = useQuery({
    queryKey: ["invoice-exchanges"],
    queryFn: async () => {
      const { data } = await api.get<{
        data: {
          id: string;
          hotelName: string;
          exchangeDate: string;
          receiptNumber: string;
          totalAmount: string;
        }[];
      }>("/invoice-exchanges");
      return data.data;
    },
  });

  const createExchange = useMutation({
    mutationFn: async () => {
      const payload = {
        hotelId,
        exchangeDate,
        notes: notes || undefined,
        lines: lines
          .filter((l) => l.description.trim() && Number(l.amount) >= 0)
          .map((l) => ({ description: l.description.trim(), amount: Number(l.amount) })),
      };
      const { data } = await api.post("/invoice-exchanges", payload);
      return data as { data: { id: string } };
    },
    onSuccess: (res) => {
      toast.success("Penukaran faktur tersimpan — piutang otomatis dibuat");
      setOpen(false);
      setNotes("");
      setLines([{ description: "", amount: "" }]);
      qc.invalidateQueries({ queryKey: ["invoice-exchanges"] });
      qc.invalidateQueries({ queryKey: ["receivables"] });
      window.open(`/invoice-exchange/${res.data.id}/receipt`, "_blank", "noopener,noreferrer");
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  return (
    <AppShell searchPlaceholder="Cari faktur…">
      <div className={pageStackWide}>
        <PageHeader
          title="Penukaran faktur"
          description="Penukaran faktur per hotel — cetak kwitansi dari total baris."
        >
          <Button type="button" className="btn-gradient border-0" onClick={() => setOpen(true)}>
            <Plus className="mr-2 size-4" />
            Buat penukaran
          </Button>
        </PageHeader>

        <div className="surface-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. kwitansi</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[120px]" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Penukaran faktur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Hotel</Label>
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
              {!hotels.data?.length && !hotels.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  Belum ada hotel. Tambahkan di{" "}
                  <Link
                    href="/stock/harga-hotel"
                    className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                  >
                    Inventori → Harga hotel
                  </Link>{" "}
                  (Master hotel).
                </p>
              ) : null}
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
                      className="w-28"
                      inputMode="decimal"
                      placeholder="Nominal"
                      value={line.amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((ls) => ls.map((x, j) => (j === i ? { ...x, amount: v } : x)));
                      }}
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
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              className="btn-gradient border-0"
              disabled={
                createExchange.isPending ||
                !hotelId ||
                !lines.some((l) => l.description.trim() && Number(l.amount) > 0)
              }
              onClick={() => createExchange.mutate()}
            >
              Simpan & kwitansi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
