import { api } from "@/lib/api";

export type BulkMasterUploadResponse = {
  success?: boolean;
  /** Sesuaikan dengan payload backend */
  data?: unknown;
  error?: string;
};

/**
 * Upload file Excel (.xls / .xlsx) ke `POST /api/bulk-master/upload`.
 * Field form: `file` (sama seperti contoh backend).
 */
export async function uploadBulkMasterExcel(
  file: File,
): Promise<BulkMasterUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<BulkMasterUploadResponse>("/bulk-master/upload", form);
  return data;
}
