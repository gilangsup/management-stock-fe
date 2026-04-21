"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { DateField } from "@/components/forms/date-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinishedProductCombobox } from "@/components/inventory/finished-product-combobox";
import type { FinishedProductStockMovementRow } from "@/components/inventory/types";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatIntegerQty } from "@/lib/format";

export default function StockBarangMasukPage() {
  const qc = useQueryClient();
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [finishedProductId, setFinishedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [productionDate, setProductionDate] = useState(anchor);
  const [picName, setPicName] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const q = Math.floor(Number(quantity));
      if (!Number.isFinite(q) || q < 1) throw new Error("QTY");
      const { data } = await api.post<{ success: boolean; data: FinishedProductStockMovementRow }>(
        "/finished-products/stock-movements/in",
        {
          finishedProductId,
          quantity: q,
          productionDate,
          picName: picName.trim(),
        },
      );
      return data;
    },
    onSuccess: (res) => {
      const st = res?.data?.finishedProduct?.stockQuantity;
      toast.success(
        st != null
          ? `Stok masuk tercatat. Stok SKU sekarang: ${formatIntegerQty(st)}.`
          : "Stok masuk tercatat.",
      );
      setFinishedProductId("");
      setQuantity("1");
      setProductionDate(anchor);
      setPicName("");
      qc.invalidateQueries({ queryKey: ["finished-products"] });
      qc.invalidateQueries({ queryKey: ["finished-product-stock-movements"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === "QTY") {
        toast.error("Isi kuantitas bilangan bulat ≥ 1.");
        return;
      }
      if (isAxiosError(err)) {
        const d = err.response?.data as { error?: string } | undefined;
        if (d?.error) {
          toast.error(d.error);
          return;
        }
      }
      toast.error(getApiErrorMessage(err, "Gagal mencatat stok masuk"));
    },
  });

  const canSubmit =
    finishedProductId &&
    picName.trim() &&
    Number.isFinite(Math.floor(Number(quantity))) &&
    Math.floor(Number(quantity)) >= 1;

  return (
    <>
      <PageHeader
        title="Stock barang masuk"
        description="Menambah stok global per SKU (master barang jadi). Isi tanggal pembuatan dan PIC."
      />
      <Card className="max-w-lg border-border">
        <CardHeader>
          <CardTitle className="text-base">Catat produksi / stok masuk</CardTitle>
          <CardDescription>
            Pilih barang dari master, kuantitas, tanggal pembuatan, dan nama penanggung jawab.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Barang jadi</Label>
            <FinishedProductCombobox
              value={finishedProductId}
              onChange={setFinishedProductId}
              disabled={submit.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal pembuatan</Label>
            <DateField value={productionDate} onChange={setProductionDate} />
          </div>
          <div className="space-y-2">
            <Label>Kuantitas</Label>
            <Input
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="≥ 1"
              disabled={submit.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Nama PIC</Label>
            <Input
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              placeholder="Penanggung jawab"
              autoComplete="name"
              disabled={submit.isPending}
            />
          </div>
          <Button
            type="button"
            className="btn-gradient w-full border-0 sm:w-auto"
            disabled={!canSubmit || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Menyimpan…" : "Simpan stok masuk"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
