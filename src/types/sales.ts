/** Faktur penjualan (bon) — `GET/POST /api/sales-transactions`. */

export type SalesInvoiceListItem = {
  id: string;
  transactionCode: string;
  saleDate: string;
  hotelId: string;
  hotelCode?: string | null;
  hotelName: string;
  grandTotal: string;
};

export type SalesInvoiceLine = {
  itemCode: string;
  name: string;
  unit: { code: string; name: string };
  sellPrice: string;
  qty: string;
  lineTotal: string;
};

export type SalesInvoiceDetail = {
  id: string;
  transactionCode: string;
  saleDate: string;
  hotelId: string;
  hotelCode?: string | null;
  hotelName: string;
  grandTotal: string;
  lines: SalesInvoiceLine[];
};

/** `GET /sales-transactions/preview-line` */
export type SalesPreviewLine = {
  hotelCode: string;
  hotelName: string;
  itemCode: string;
  name: string;
  unit: { code: string; name: string };
  sellPrice: string;
};

export type SalesListMeta = {
  total: number;
  page: number;
  limit: number;
};
