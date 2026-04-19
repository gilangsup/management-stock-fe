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
  unit: { id: string; code: string; name: string };
  unitPrice: string;
  quantityOnHand: string;
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
  createdAt: string;
  updatedAt: string;
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
