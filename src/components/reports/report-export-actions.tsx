"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadAuthenticatedFile } from "@/lib/export-utils";

type Props = {
  exportPath: string;
  params: Record<string, string | undefined>;
  onPrintPdf: () => void;
  disabled?: boolean;
  label?: string;
};

export function ReportExportActions({
  exportPath,
  params,
  onPrintPdf,
  disabled,
  label = "laporan",
}: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExcel = async () => {
    setExporting(true);
    try {
      await downloadAuthenticatedFile(exportPath, params);
      toast.success(`Excel ${label} berhasil diunduh`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh Excel");
    } finally {
      setExporting(false);
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
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onPrintPdf}>
        <FileDown className="mr-1.5 size-3.5" />
        PDF
      </Button>
    </div>
  );
}
