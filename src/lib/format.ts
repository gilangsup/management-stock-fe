export function formatIdr(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Qty stok / unit: bilangan bulat non-desimal, selaras dengan kolom INT di MySQL. */
export function formatIntegerQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const raw = typeof value === "string" ? value.trim().replace(",", ".") : String(value);
  const n = Number(raw);
  if (Number.isNaN(n)) return "—";
  return String(Math.max(0, Math.round(n)));
}
