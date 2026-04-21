"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/forms/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatIdr } from "@/lib/format";
import type { ExpenseBatchSuccessResponse } from "@/types/expenses";
import { RawMaterialCombobox } from "./raw-material-combobox";

function isExpenseTotalFromQtyAndUnit(qty: string, unitPrice: string): boolean {
  const tq = qty.trim();
  const tu = unitPrice.trim();
  if (tq === "" || tu === "") return false;
  const q = Number(tq);
  const u = Number(tu);
  return Number.isFinite(q) && Number.isFinite(u);
}

type LineDraft = {
  key: string;
  rawMaterialId: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  /** Override catatan global untuk baris ini (opsional). */
  lineNotes: string;
};

function newLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    rawMaterialId: "",
    qty: "1",
    unitPrice: "",
    totalPrice: "",
    lineNotes: "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tanggal default (biasanya dari filter halaman Belanja). */
  anchorDate: string;
};

export function ExpensePurchaseDialog({ open, onOpenChange, anchorDate }: Props) {
  const qc = useQueryClient();
  const [expenseDate, setExpenseDate] = useState(anchorDate);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);

  const grandPreview = useMemo(() => {
    let sum = 0;
    for (const line of lines) {
      if (isExpenseTotalFromQtyAndUnit(line.qty, line.unitPrice)) {
        sum += Number(line.qty.trim()) * Number(line.unitPrice.trim());
      } else {
        const tp = line.totalPrice.trim();
        if (tp !== "" && Number.isFinite(Number(tp))) sum += Number(tp);
      }
    }
    return sum;
  }, [lines]);

  const createBatch = useMutation({
    mutationFn: async () => {
      const payload: {
        rawMaterialId: string;
        qty: number;
        unitPrice: number;
        totalPrice?: number;
        notes?: string;
      }[] = [];

      for (const line of lines) {
        const hasAny =
          line.rawMaterialId.trim() !== "" ||
          line.qty.trim() !== "" ||
          line.unitPrice.trim() !== "" ||
          line.totalPrice.trim() !== "" ||
          line.lineNotes.trim() !== "";

        if (!hasAny) continue;

        if (!line.rawMaterialId.trim()) throw new Error("BARIS_MATERIAL");
        const q = Number(line.qty);
        const u = Number(line.unitPrice);
        if (!Number.isFinite(q) || q <= 0) throw new Error("BARIS_QTY");
        if (!Number.isFinite(u) || u < 0) throw new Error("BARIS_HARGA");

        const row: (typeof payload)[0] = {
          rawMaterialId: String(line.rawMaterialId),
          qty: q,
          unitPrice: u,
        };
        if (!isExpenseTotalFromQtyAndUnit(line.qty, line.unitPrice)) {
          const tp = line.totalPrice.trim();
          if (tp !== "" && Number.isFinite(Number(tp))) row.totalPrice = Number(tp);
        }
        const ln = line.lineNotes.trim();
        if (ln) row.notes = ln;

        payload.push(row);
      }

      if (payload.length === 0) throw new Error("KOSONG");

      const body: Record<string, unknown> = {
        expenseDate,
        lines: payload,
      };
      if (notes.trim()) body.notes = notes.trim();

      const { data } = await api.post<ExpenseBatchSuccessResponse | { success: false; error?: string }>(
        "/expenses/batch",
        body,
      );
      return data;
    },
    onSuccess: (res: unknown) => {
      const r = res as Partial<ExpenseBatchSuccessResponse> | undefined;
      if (r?.success && r.data?.count != null) {
        toast.success(`Pembelian tercatat (${r.data.count} baris)`);
      } else {
        toast.success("Pembelian tercatat");
      }
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
      qc.invalidateQueries({ queryKey: ["expense-summary-dash"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        if (err.message === "KOSONG") {
          toast.error("Tambah minimal satu baris dengan bahan baku, qty, dan harga.");
          return;
        }
        if (err.message === "BARIS_MATERIAL") {
          toast.error("Pilih bahan baku pada setiap baris yang diisi.");
          return;
        }
        if (err.message === "BARIS_QTY") {
          toast.error("Isi kuantitas (> 0) pada setiap baris yang diisi.");
          return;
        }
        if (err.message === "BARIS_HARGA") {
          toast.error("Isi harga beli per satuan pada setiap baris yang diisi.");
          return;
        }
      }
      if (isAxiosError(err)) {
        const d = err.response?.data as { error?: string } | undefined;
        if (d?.error) {
          toast.error(d.error);
          return;
        }
      }
      toast.error("Gagal menyimpan");
    },
  });

  const canSubmit = useMemo(() => {
    let complete = 0;
    for (const line of lines) {
      const hasAny =
        line.rawMaterialId.trim() !== "" ||
        line.qty.trim() !== "" ||
        line.unitPrice.trim() !== "" ||
        line.totalPrice.trim() !== "" ||
        line.lineNotes.trim() !== "";
      if (!hasAny) continue;
      const q = Number(line.qty);
      const u = Number(line.unitPrice);
      if (
        !line.rawMaterialId.trim() ||
        !Number.isFinite(q) ||
        q <= 0 ||
        !Number.isFinite(u) ||
        u < 0
      ) {
        return false;
      }
      complete += 1;
    }
    return complete >= 1;
  }, [lines]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setExpenseDate(anchorDate);
      setNotes("");
      setLines([newLine()]);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,800px)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah pembelian</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Satu tanggal, beberapa barang. Total per baris mengikuti qty × harga satuan kecuali Anda
            isi total manual. &quot;Catatan default&quot; dipakai untuk setiap baris; isian
            &quot;Catatan baris&quot; menggantikan default hanya untuk baris itu.
          </p>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2 pr-1">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <DateField value={expenseDate} onChange={setExpenseDate} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Barang</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((ls) => [...ls, newLine()])}
              >
                <Plus className="mr-1 size-3.5" />
                Baris
              </Button>
            </div>

            {lines.map((line, idx) => {
              const totalAuto = isExpenseTotalFromQtyAndUnit(line.qty, line.unitPrice);
              const computedLineTotal = totalAuto
                ? Number(line.qty.trim()) * Number(line.unitPrice.trim())
                : null;

              return (
                <div
                  key={line.key}
                  className="space-y-2 rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Baris {idx + 1}</span>
                    {lines.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-7 shrink-0 text-destructive"
                        onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                        aria-label={`Hapus baris ${idx + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Bahan baku</Label>
                    <RawMaterialCombobox
                      value={line.rawMaterialId}
                      onChange={(id) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, rawMaterialId: id } : l,
                          ),
                        )
                      }
                      disabled={createBatch.isPending}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs">Kuantitas</Label>
                      <Input
                        inputMode="decimal"
                        value={line.qty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, qty: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <Label className="text-xs">Harga beli / satuan (Rp)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={line.unitPrice}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, unitPrice: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Total baris (opsional)</Label>
                      <Input
                        inputMode="decimal"
                        disabled={totalAuto}
                        value={
                          totalAuto && computedLineTotal != null
                            ? String(computedLineTotal)
                            : line.totalPrice
                        }
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, totalPrice: e.target.value } : l,
                            ),
                          )
                        }
                        placeholder={totalAuto ? undefined : "qty × harga"}
                      />
                      {totalAuto ? (
                        <p className="text-[11px] text-muted-foreground">
                          Dari qty × harga. Kosongkan qty atau harga untuk isi total manual.
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Jika kosong, server menghitung dari qty × harga setelah keduanya diisi.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Catatan baris (opsional)</Label>
                    <Input
                      placeholder="Menggantikan catatan default jika diisi"
                      value={line.lineNotes}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, lineNotes: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}

          </div>

          <div className="space-y-2">
            <Label>Catatan default (opsional)</Label>
            <textarea
              rows={2}
              placeholder="Supplier, nota, dll. — dipakai per baris kecuali baris punya catatan sendiri."
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total perkiraan (preview)</span>
            <span className="font-semibold tabular-nums">{formatIdr(String(grandPreview))}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            className="btn-gradient border-0"
            disabled={!canSubmit || createBatch.isPending}
            onClick={() => createBatch.mutate()}
          >
            {createBatch.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
