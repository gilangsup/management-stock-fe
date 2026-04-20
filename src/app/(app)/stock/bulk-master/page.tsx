"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BulkMasterUploadButton } from "@/components/bulk/bulk-master-upload-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoredUser } from "@/lib/auth-storage";

export default function BulkMasterPage() {
  const qc = useQueryClient();
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

  function onUploadSuccess() {
    qc.invalidateQueries({ queryKey: ["raw-materials"] });
    qc.invalidateQueries({ queryKey: ["finished-products"] });
    qc.invalidateQueries({ queryKey: ["master-units"] });
    qc.invalidateQueries({ queryKey: ["master-snack-categories"] });
    qc.invalidateQueries({ queryKey: ["hotels"] });
    qc.invalidateQueries({ queryKey: ["hotel-sell-prices"] });
    qc.invalidateQueries({ queryKey: ["dash-inventory"] });
  }

  return (
    <>
      <PageHeader
        title="Bulk master (Excel)"
        description="Unggah workbook .xlsx (sheet LIST HOTEL & DAFTAR BAHAN BELANJAAN) sesuai template backend. Hanya akun admin yang dapat mengunggah."
      />

      <Card className="max-w-xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">Upload file</CardTitle>
              <CardDescription>
                Pilih satu file Excel. Field form mengikuti API:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">file</code> (multipart).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin ? (
            <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              Anda masuk sebagai <strong>bukan admin</strong>. Endpoint ini memerlukan role{" "}
              <strong>admin</strong> — tombol upload dinonaktifkan.
            </p>
          ) : null}
          <BulkMasterUploadButton
            label="Pilih file Excel"
            disabled={!isAdmin}
            onSuccess={onUploadSuccess}
          />
          <p className="text-xs text-muted-foreground">
            Setelah sukses, daftar master terkait di aplikasi akan disegarkan. Gunakan template
            workbook yang disediakan backend (kolom/sheet harus sesuai parser).
          </p>
        </CardContent>
      </Card>
    </>
  );
}
