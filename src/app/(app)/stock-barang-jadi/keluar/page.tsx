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
import { UnitSelect } from "@/components/inventory/unit-select";
import { useInventoryMasters } from "@/components/inventory/use-inventory-masters";
import type { FinishedProductRow, FinishedProductStockMovementRow } from "@/components/inventory/types";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatIntegerQty } from "@/lib/format";

function stockOutToastMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as {
      error?: string;
      details?: { currentStock?: number; requested?: number };
    };
    if (d?.details && typeof d.details.currentStock === "number") {
      const req = d.details.requested;
      const base = d.error ?? "Stok tidak mencukupi";
      return `${base} — tersedia: ${d.details.currentStock}${req != null ? `, diminta: ${req}` : ""}`;
    }
    if (d?.error) return d.error;
  }
  return getApiErrorMessage(err, "Gagal mencatat stok keluar");
}

export default function StockBarangKeluarPage() {
  const qc = useQueryClient();
  const { units } = useInventoryMasters();
  const unitRows = units.data?.data ?? [];
  const anchor = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [finishedProductId, setFinishedProductId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pickupDate, setPickupDate] = useState(anchor);
  const [keterangan, setKeterangan] = useState("");

  const handleProductSelect = (product: FinishedProductRow | null) => {
    setUnitId(product?.unit?.id ? String(product.unit.id) : "");
  };

  const submit = useMutation({
    mutationFn: async () => {
      const q = Math.floor(Number(quantity));
      if (!Number.isFinite(q) || q < 1) throw new Error("QTY");
      if (!unitId) throw new Error("UNIT");
      const { data } = await api.post<{ success: boolean; data: FinishedProductStockMovementRow }>(
        "/finished-products/stock-movements/out",
        {
          finishedProductId,
          quantity: q,
          pickupDate,
          keterangan: keterangan.trim(),
          unitId,
        },
      );
      return data;
    },
    onSuccess: (res) => {
      const st = res?.data?.finishedProduct?.stockQuantity;
      toast.success(
        st != null
          ? `Stok keluar tercatat. Stok SKU sekarang: ${formatIntegerQty(st)}.`
          : "Stok keluar tercatat.",
      );
      setFinishedProductId("");
      setUnitId("");
      setQuantity("1");
      setPickupDate(anchor);
      setKeterangan("");
      qc.invalidateQueries({ queryKey: ["finished-products"] });
      qc.invalidateQueries({ queryKey: ["finished-product-stock-movements"] });
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        if (err.message === "QTY") {
          toast.error("Isi kuantitas bilangan bulat ≥ 1.");
          return;
        }
        if (err.message === "UNIT") {
          toast.error("Pilih satuan barang jadi.");
          return;
        }
      }
      toast.error(stockOutToastMessage(err));
    },
  });

  const canSubmit =
    finishedProductId &&
    unitId &&
    keterangan.trim() &&
    Number.isFinite(Math.floor(Number(quantity))) &&
    Math.floor(Number(quantity)) >= 1;

  return (
    <>
      <PageHeader
        title="Stock barang keluar"
        description="Mengurangi stok global per SKU. Pilih barang, satuan, kuantitas, tanggal pengambilan, dan keterangan."
      />
      <Card className="max-w-lg border-border">
        <CardHeader>
          <CardTitle className="text-base">Catat pengambilan / stok keluar</CardTitle>
          <CardDescription>
            Satuan mengikuti master barang jadi — dapat disesuaikan per item sebelum menyimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Barang jadi</Label>
            <FinishedProductCombobox
              value={finishedProductId}
              onChange={setFinishedProductId}
              onProductSelect={handleProductSelect}
              disabled={submit.isPending}
            />
          </div>
          <UnitSelect
            value={unitId}
            onChange={setUnitId}
            units={unitRows}
            disabled={submit.isPending || !finishedProductId}
          />
          <div className="space-y-2">
            <Label>Tanggal pengambilan</Label>
            <DateField value={pickupDate} onChange={setPickupDate} />
          </div>
          <div className="space-y-2">
            <Label>Kuantitas{unitId ? ` (${unitRows.find((u) => u.id === unitId)?.code ?? ""})` : ""}</Label>
            <Input
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="≥ 1"
              disabled={submit.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: pengiriman hotel X"
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
            {submit.isPending ? "Menyimpan…" : "Simpan stok keluar"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
