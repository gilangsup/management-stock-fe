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

/** Stok / nilai desimal dari API (string DECIMAL). */
export function formatDecimalQty(
  value: string | number | null | undefined,
  maxFractionDigits = 6,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

/** Margin persen dari kolom generated di backend. */
export function formatMarginPercent(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

const SATUAN = [
  "", "Satu", "Dua", "Tiga", "Empat", "Lima",
  "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh",
  "Sebelas", "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas",
  "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas",
];
const PULUHAN = [
  "", "", "Dua Puluh", "Tiga Puluh", "Empat Puluh", "Lima Puluh",
  "Enam Puluh", "Tujuh Puluh", "Delapan Puluh", "Sembilan Puluh",
];

function _terbilang(n: number): string {
  if (n === 0) return "";
  let result = "";
  if (n >= 1_000_000_000) {
    result += _terbilang(Math.floor(n / 1_000_000_000)) + " Miliar ";
    n %= 1_000_000_000;
  }
  if (n >= 1_000_000) {
    result += _terbilang(Math.floor(n / 1_000_000)) + " Juta ";
    n %= 1_000_000;
  }
  if (n >= 1_000) {
    const k = Math.floor(n / 1_000);
    result += (k === 1 ? "Seribu" : _terbilang(k) + " Ribu") + " ";
    n %= 1_000;
  }
  if (n >= 100) {
    const h = Math.floor(n / 100);
    result += (h === 1 ? "Seratus" : SATUAN[h] + " Ratus") + " ";
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      result += SATUAN[n];
    } else {
      result += PULUHAN[Math.floor(n / 10)];
      if (n % 10 > 0) result += " " + SATUAN[n % 10];
    }
  }
  return result.trim();
}

/** Tanggal panjang: 06 April 2020 */
export function formatDateLong(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Angka untuk baris Rp kwitansi: 3,000,000 */
export function formatIdrAmountLine(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-US");
}

/** Konversi angka ke teks Rupiah (terbilang). Contoh: 35500 → "Tiga Puluh Lima Ribu Lima Ratus Rupiah" */
export function terbilang(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) return "";
  const int = Math.floor(n);
  if (int === 0) return "Nol Rupiah";
  return _terbilang(int) + " Rupiah";
}

/** Terbilang uppercase — untuk field UANG SEJUMLAH pada kwitansi. */
export function terbilangUpper(value: string | number): string {
  return terbilang(value).toUpperCase();
}

/** Terbilang lowercase — untuk footer faktur penjualan. */
export function terbilangLower(value: string | number): string {
  return terbilang(value).toLowerCase();
}

/** Format angka faktur: 18.000,00 */
export function formatInvoiceAmount(value: string | number, fractionDigits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0,00";
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Tanggal faktur: 09/04/2026 20:36:05 */
export function formatInvoiceDateTime(isoDate: string, createdAt?: string | null): string {
  const datePart = isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate;
  const d = new Date(`${datePart}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let time = "00:00:00";
  if (createdAt) {
    const t = new Date(createdAt);
    if (!Number.isNaN(t.getTime())) {
      time = t.toLocaleTimeString("en-GB", { hour12: false });
    }
  }
  return `${dd}/${mm}/${yyyy} ${time}`;
}
