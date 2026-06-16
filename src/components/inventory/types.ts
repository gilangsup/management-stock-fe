export type ListMeta = { page: number; limit: number; total: number };

export type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  meta: ListMeta;
};

export type UnitRow = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type SnackCategoryRow = {
  id: string;
  name: string;
  codePrefix: string;
  createdAt: string;
  updatedAt: string;
};

export type RawMaterialRow = {
  id: string;
  itemCode: string | null;
  name: string;
  /** Harga pokok per satuan (DECIMAL dari server, disimpan sebagai string). */
  costPrice: string;
  unit: { id: string; code: string; name: string };
  /** Sama sumber master dengan barang jadi — prefix + 3 digit urut per kategori. */
  snackCategory: { id: string; name: string; codePrefix: string };
  categorySeq: number;
  createdAt: string;
  updatedAt: string;
};

export type FinishedProductRow = {
  id: string;
  itemCode: string;
  name: string;
  unit: { id: string; code: string; name: string };
  snackCategory: { id: string; name: string; codePrefix: string };
  categorySeq: number;
  costPrice: string;
  /** Stok global SKU; diubah hanya lewat mutasi stok masuk/keluar. */
  stockQuantity?: number;
  createdAt: string;
  updatedAt: string;
};

/** Satu baris riwayat dari GET /finished-products/stock-movements */
export type FinishedProductStockMovementRow = {
  id: string;
  direction: "in" | "out";
  quantity: number;
  /** Saldo kumulatif stok setelah transaksi ini (historis, bukan nilai master saat ini). */
  stockAfter: number;
  productionDate: string | null;
  pickupDate: string | null;
  /** Keterangan / penanggung jawab (alias picName). */
  keterangan: string;
  picName: string;
  createdAt: string;
  finishedProduct: {
    id: string;
    itemCode: string;
    name: string;
    stockQuantity: number;
    unit?: { id: string; code: string; name: string } | null;
    snackCategory?: { id: string; name: string; codePrefix: string };
  };
};

/** Baris dari GET /finished-product-movements — satu riwayat mutasi stok barang jadi. */
export type FinishedProductMovementRow = {
  id: string;
  finishedProductId: string;
  direction: "masuk" | "keluar";
  qty: number;
  picName: string;
  eventDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  productName: string | null;
  itemCode: string | null;
  /** Saldo kumulatif stok setelah kejadian ini (running balance). */
  stockAfter: number | null;
};

// ---------------------------------------------------------------------------
// Pesanan Harian
// ---------------------------------------------------------------------------

export type DeliverySlot = "CB1" | "CB2" | "CB3" | "unspecified";
export type OrderSource = "internal" | "vendor";
export type OrderStatus = "draft" | "confirmed";

export type DailyOrderLine = {
  id: string;
  finishedProductId: string;
  itemCode: string;
  productName: string;
  unit: { code: string; name: string };
  deliverySlot: DeliverySlot;
  qty: string;
  unitPrice: string;
  lineTotal: string;
  source: OrderSource;
  notes: string | null;
  sortOrder: number;
};

export type DailyOrderListItem = {
  id: string;
  orderDate: string;
  deliveryDate: string | null;
  hotel: { id: string; code: string; name: string };
  poNumber: string | null;
  notes: string | null;
  lineNotesSummary: string | null;
  status: OrderStatus;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DailyOrderDetail = DailyOrderListItem & {
  lines: DailyOrderLine[];
  grandTotal: string;
};

/** Baris dari GET /hotels/:hotelId/finished-sell-prices (satu baris per barang jadi). */
export type HotelFinishedSellPriceRow = {
  finishedProductId: string;
  itemCode: string;
  name: string;
  costPrice: string;
  sellPrice: string | null;
  marginPercent: string | null;
  priceRowId: string | null;
  priceUpdatedAt: string | null;
};
