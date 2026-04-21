"use client";

import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type BulkMasterUploadResponse,
  uploadBulkMasterExcel,
} from "@/lib/bulk-master-upload";
import { getApiErrorMessage } from "@/lib/api-error";

const ACCEPT =
  ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Props = {
  /** Dipanggil setelah upload sukses (mis. invalidate query). */
  onSuccess?: (result: BulkMasterUploadResponse) => void;
  /** Label tombol */
  label?: string;
  /** Nonaktifkan input */
  disabled?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

export function BulkMasterUploadButton({
  onSuccess,
  label = "Upload bulk (Excel)",
  disabled,
  variant = "outline",
  size = "default",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLoading(true);
    try {
      const result = await uploadBulkMasterExcel(file);
      if (result.success === false && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Upload bulk berhasil diproses");
      onSuccess?.(result);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        toast.error(
          "Upload bulk master hanya untuk akun admin. Hubungi admin jika Anda membutuhkan akses.",
        );
        return;
      }
      toast.error(getApiErrorMessage(err, "Gagal upload bulk"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 size-4" />
        {loading ? "Mengunggah…" : label}
      </Button>
    </>
  );
}
