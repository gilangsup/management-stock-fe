import { getToken } from "./auth-storage";

const apiBase = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api`;

/** Unduh file dari endpoint API yang membutuhkan Bearer token (mis. export Excel). */
export async function downloadAuthenticatedFile(
  path: string,
  params?: Record<string, string | undefined>,
  fallbackFilename = "export.xlsx",
): Promise<void> {
  const token = getToken();
  const url = new URL(`${apiBase}${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Download gagal (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const cd = res.headers.get("Content-Disposition");
  const filename = cd?.match(/filename="?([^";\n]+)"?/)?.[1] ?? fallbackFilename;
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

const PRINT_STYLES = `
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  .text-right { text-align: right; }
  .section { margin-top: 20px; }
  .section h2 { font-size: 14px; margin: 0 0 8px; }
  tfoot td { font-weight: 600; background: #fafafa; }
  @media print { body { margin: 12px; } }
`;

/** Buka jendela cetak untuk export PDF via dialog print browser. */
export function printHtmlDocument(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup diblokir browser. Izinkan popup untuk cetak PDF.");
  }
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`,
  );
  win.document.close();
  win.onload = () => {
    win.focus();
    setTimeout(() => win.print(), 250);
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { escapeHtml };
