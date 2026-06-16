"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { RawMaterialRow } from "@/components/inventory/types";
import { RawMaterialCombobox } from "./raw-material-combobox";

type LineDraft = {
  key: string;
  rawMaterialId: string;
  qty: string;
  /** costPrice dari master bahan baku yang dipilih; dipakai untuk preview total. */
  masterCostPrice: string;
  /** Harga per satuan — pre-fill dari master, bisa diubah user. */
  unitPrice: string;
  /** Override total baris manual (opsional) — jika diisi, menggantikan qty × unitPrice. */
  totalPrice: string;
  /** Override catatan global untuk baris ini (opsional). */
  lineNotes: string;
};

function newLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    rawMaterialId: "",
    qty: "0",
    masterCostPrice: "",
    unitPrice: "",
    totalPrice: "",
    lineNotes: "",
  };
}

type FormSnapshot = {
  expenseDate: string;
  notes: string;
  lines: LineDraft[];
};

function normalizeLine(line: LineDraft) {
  return {
    rawMaterialId: line.rawMaterialId.trim(),
    qty: line.qty.trim(),
    unitPrice: line.unitPrice.trim(),
    totalPrice: line.totalPrice.trim(),
    lineNotes: line.lineNotes.trim(),
  };
}

function linesEqual(a: LineDraft[], b: LineDraft[]) {
  if (a.length !== b.length) return false;
  return a.every((line, i) => {
    const left = normalizeLine(line);
    const right = normalizeLine(b[i]!);
    return (
      left.rawMaterialId === right.rawMaterialId &&
      left.qty === right.qty &&
      left.unitPrice === right.unitPrice &&
      left.totalPrice === right.totalPrice &&
      left.lineNotes === right.lineNotes
    );
  });
}

function snapshotLines(lines: LineDraft[]): LineDraft[] {
  return lines.map((line) => ({ ...line }));
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
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  /** Supaya reset hanya saat dialog baru dibuka (bukan saat anchorDate berubah saat sudah terbuka). */
  const wasOpenRef = useRef(false);
  const initialFormRef = useRef<FormSnapshot | null>(null);

  const resetForm = useCallback(
    (date = anchorDate) => {
      const initialLines = [newLine()];
      setExpenseDate(date);
      setNotes("");
      setLines(initialLines);
      initialFormRef.current = {
        expenseDate: date,
        notes: "",
        lines: snapshotLines(initialLines),
      };
    },
    [anchorDate],
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      resetForm(anchorDate);
    }
    wasOpenRef.current = open;
  }, [open, anchorDate, resetForm]);

  const isDirty = useMemo(() => {
    const initial = initialFormRef.current;
    if (!initial || !open) return false;
    if (expenseDate !== initial.expenseDate) return true;
    if (notes.trim() !== initial.notes.trim()) return true;
    return !linesEqual(lines, initial.lines);
  }, [open, expenseDate, notes, lines]);

  const closeWithoutConfirm = useCallback(() => {
    setConfirmDiscardOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    closeWithoutConfirm();
  }, [closeWithoutConfirm, isDirty]);

  const confirmDiscard = useCallback(() => {
    resetForm(anchorDate);
    closeWithoutConfirm();
  }, [anchorDate, closeWithoutConfirm, resetForm]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }
      requestClose();
    },
    [onOpenChange, requestClose],
  );

  const grandPreview = useMemo(() => {
    let sum = 0;
    for (const line of lines) {
      const tp = Number(line.totalPrice.trim());
      if (Number.isFinite(tp) && tp > 0) {
        sum += tp;
        continue;
      }
      const q = Number(line.qty.trim());
      const cp = Number(line.unitPrice.trim());
      if (Number.isFinite(q) && q > 0 && Number.isFinite(cp) && cp > 0) {
        sum += q * cp;
      }
    }
    return sum;
  }, [lines]);

  const createBatch = useMutation({
    mutationFn: async () => {
      const payload: {
        rawMaterialId: string;
        qty: number;
        unitPrice?: number;
        totalPrice?: number;
        notes?: string;
      }[] = [];

      for (const line of lines) {
        const hasAny =
          line.rawMaterialId.trim() !== "" ||
          line.qty.trim() !== "" ||
          line.lineNotes.trim() !== "";

        if (!hasAny) continue;

        if (!line.rawMaterialId.trim()) throw new Error("BARIS_MATERIAL");
        const q = Number(line.qty);
        if (!Number.isFinite(q) || q <= 0) throw new Error("BARIS_QTY");

        const row: (typeof payload)[0] = {
          rawMaterialId: String(line.rawMaterialId),
          qty: q,
        };
        // Kirim unitPrice jika user sudah isi (pre-fill dari master atau input manual)
        const cp = Number(line.unitPrice.trim());
        if (Number.isFinite(cp) && cp > 0) row.unitPrice = cp;
        // Kirim totalPrice jika user isi manual (override qty × unitPrice)
        const tp = Number(line.totalPrice.trim());
        if (Number.isFinite(tp) && tp > 0) row.totalPrice = tp;
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
      resetForm(anchorDate);
      closeWithoutConfirm();
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
        line.lineNotes.trim() !== "";
      if (!hasAny) continue;
      const q = Number(line.qty);
      if (!line.rawMaterialId.trim() || !Number.isFinite(q) || q <= 0) return false;
      complete += 1;
    }
    return complete >= 1;
  }, [lines]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,800px)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah pembelian</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Satu tanggal, beberapa barang. Harga satuan otomatis terisi dari master bahan baku dan
            bisa diubah langsung — tanpa perlu edit master dulu.
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
                      onSelect={(row: RawMaterialRow) => {
                        const cp = row.costPrice ?? "";
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? {
                                  ...l,
                                  // Simpan master price sebagai referensi hint
                                  masterCostPrice: cp,
                                  // Pre-fill unitPrice dari master; user bisa override
                                  unitPrice: cp && Number(cp) > 0 ? String(Number(cp)) : "",
                                }
                              : l,
                          ),
                        );
                      }}
                      disabled={createBatch.isPending}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
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
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Harga beli / satuan (Rp)
                      </Label>
                      <Input
                        inputMode="decimal"
                        min={0}
                        step="any"
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
                      {/* Hint harga master sebagai referensi */}
                      {Number(line.masterCostPrice) > 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          Master: {formatIdr(line.masterCostPrice)}
                          {line.unitPrice && Number(line.unitPrice) !== Number(line.masterCostPrice) ? (
                            <span className="ml-1 text-amber-600">(diubah)</span>
                          ) : null}
                        </p>
                      ) : line.rawMaterialId ? (
                        <p className="text-[11px] text-amber-600">Harga master belum diset.</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Total baris{" "}
                        <span className="font-normal text-muted-foreground">(opsional)</span>
                      </Label>
                      <Input
                        inputMode="decimal"
                        min={0}
                        step="any"
                        placeholder={
                          line.qty && line.unitPrice
                            ? String(Number(line.qty) * Number(line.unitPrice))
                            : "qty × harga"
                        }
                        value={line.totalPrice}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, totalPrice: e.target.value } : l,
                            ),
                          )
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Isi jika total berbeda dari qty × harga.
                      </p>
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
          <Button type="button" variant="ghost" onClick={requestClose}>
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

      <Dialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Keluar dari form?</DialogTitle>
            <DialogDescription>
              Data yang telah Anda isi belum disimpan.
              <br />
              Apakah Anda yakin ingin keluar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setConfirmDiscardOpen(false)}>
              Tetap di Form
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDiscard}>
              Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
