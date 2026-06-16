/** Baris agregat per hotel + produk (+ slot opsional) — format sama dengan rekap PDF. */

export type PerHotelSummaryRow = {
  hotelCode: string;
  deliverySlot?: string;
  productName: string;
  itemCode: string;
  unitCode: string;
  qty: number;
  notes: string;
};

export type HotelQtyNote = {
  hotelCode: string;
  qty: number;
  notes: string;
};

export type ProductSummaryGroup = {
  productName: string;
  itemCode: string;
  unitCode: string;
  byHotel: HotelQtyNote[];
};

export const ORDER_SLOT_ORDER = ["CB1", "CB2", "CB3", "unspecified"] as const;

export function formatQtyPart(qty: number): string {
  return Number.isInteger(qty)
    ? qty.toLocaleString("id-ID")
    : qty.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

export function sortByHotelCode(entries: HotelQtyNote[]): HotelQtyNote[] {
  return [...entries].sort((a, b) => a.hotelCode.localeCompare(b.hotelCode));
}

export function formatQtyDisplay(
  group: ProductSummaryGroup,
  opts?: { includeUnit?: boolean },
): string {
  const parts = sortByHotelCode(group.byHotel).map((h) => formatQtyPart(h.qty));
  const joined = parts.join("/");
  if (opts?.includeUnit !== false && group.unitCode) return `${joined} ${group.unitCode}`;
  return joined;
}

export function formatNotesDisplay(group: ProductSummaryGroup): string {
  const parts = sortByHotelCode(group.byHotel).map((h) => h.notes?.trim() || "-");
  if (parts.every((p) => p === "-")) return "-";
  return parts.join(" / ");
}

/** Gabungkan baris mentah (per order line) → satu baris per hotel + produk (+ slot). */
export function aggregateRawLinesToPerHotelRows<
  T extends {
    deliverySlot?: string;
    itemCode: string;
    unitCode: string;
    productName: string;
    hotelCode: string;
    qty: string | number;
    notes: string | null;
  },
>(lines: T[]): PerHotelSummaryRow[] {
  const map = new Map<
    string,
    { row: PerHotelSummaryRow; noteParts: string[]; qtySum: number }
  >();

  for (const line of lines) {
    const slot = line.deliverySlot ?? "";
    const key = `${slot}\0${line.itemCode}\0${line.unitCode}\0${line.hotelCode}`;
    const qty = Number(line.qty);
    const note = line.notes?.trim() || "-";

    if (!map.has(key)) {
      map.set(key, {
        row: {
          hotelCode: line.hotelCode,
          deliverySlot: line.deliverySlot,
          productName: line.productName,
          itemCode: line.itemCode,
          unitCode: line.unitCode,
          qty: 0,
          notes: "-",
        },
        noteParts: [],
        qtySum: 0,
      });
    }
    const entry = map.get(key)!;
    entry.qtySum += Number.isFinite(qty) ? qty : 0;
    entry.noteParts.push(note);
  }

  return Array.from(map.values()).map(({ row, noteParts, qtySum }) => ({
    ...row,
    qty: qtySum,
    notes: noteParts.every((n) => n === "-") ? "-" : noteParts.join(" / "),
  }));
}

/** Kelompokkan baris per-hotel menjadi produk per slot (CB). */
export function groupProductsBySlot(
  rows: PerHotelSummaryRow[],
): Map<string, ProductSummaryGroup[]> {
  const slotMap = new Map<string, Map<string, ProductSummaryGroup>>();

  for (const row of rows) {
    const slot = row.deliverySlot ?? "unspecified";
    if (!slotMap.has(slot)) slotMap.set(slot, new Map());
    const products = slotMap.get(slot)!;
    const productKey = `${row.itemCode}\0${row.unitCode}`;
    if (!products.has(productKey)) {
      products.set(productKey, {
        productName: row.productName,
        itemCode: row.itemCode,
        unitCode: row.unitCode,
        byHotel: [],
      });
    }
    products.get(productKey)!.byHotel.push({
      hotelCode: row.hotelCode,
      qty: row.qty,
      notes: row.notes?.trim() || "-",
    });
  }

  const result = new Map<string, ProductSummaryGroup[]>();
  for (const [slot, products] of slotMap) {
    result.set(
      slot,
      Array.from(products.values()).sort((a, b) =>
        a.productName.localeCompare(b.productName, "id"),
      ),
    );
  }
  return result;
}

/** Kelompokkan baris per-hotel menjadi produk (tanpa slot — untuk vendor). */
export function groupProductsFlat(rows: PerHotelSummaryRow[]): ProductSummaryGroup[] {
  const products = new Map<string, ProductSummaryGroup>();

  for (const row of rows) {
    const productKey = `${row.itemCode}\0${row.unitCode}`;
    if (!products.has(productKey)) {
      products.set(productKey, {
        productName: row.productName,
        itemCode: row.itemCode,
        unitCode: row.unitCode,
        byHotel: [],
      });
    }
    products.get(productKey)!.byHotel.push({
      hotelCode: row.hotelCode,
      qty: row.qty,
      notes: row.notes?.trim() || "-",
    });
  }

  return Array.from(products.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName, "id"),
  );
}

/** Bangun grup produk per slot dari baris rekap API (sudah per hotel). */
export function buildSlotProductGroups(
  rows: PerHotelSummaryRow[],
): Map<string, ProductSummaryGroup[]> {
  return groupProductsBySlot(rows);
}
