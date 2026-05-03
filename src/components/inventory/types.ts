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
  /** Harga satuan acuan; string DECIMAL dari API (mis. "15000.0000"). Default "0.0000". */
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
