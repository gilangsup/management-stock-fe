"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadAuthenticatedFile } from "@/lib/export-utils";

type Props = {
  date: string;
  kind: "kitchen" | "vendor";
  onPrintPdf: () => void;
  disabled?: boolean;
};

const EXPORT_PATH: Record<Props["kind"], string> = {
  kitchen: "/daily-orders/summary/kitchen/export",
  vendor: "/daily-orders/summary/vendor/export",
};

const LABEL: Record<Props["kind"], string> = {
  kitchen: "Instruksi dapur",
  vendor: "Beli vendor",
};

export function OrderExportActions({ date, kind, onPrintPdf, disabled }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExcel = async () => {
    setExporting(true);
    try {
      await downloadAuthenticatedFile(EXPORT_PATH[kind], { date });
      toast.success(`Excel ${LABEL[kind]} berhasil diunduh`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh Excel");
    } finally {
      setExporting(false);
    }
  };

  const handlePdf = () => {
    try {
      onPrintPdf();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuka cetak PDF");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || exporting}
        onClick={() => void handleExcel()}
      >
        {exporting ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-1.5 size-3.5" />
        )}
        Excel
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={handlePdf}>
        <FileDown className="mr-1.5 size-3.5" />
        PDF
      </Button>
    </div>
  );
}
