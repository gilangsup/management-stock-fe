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
  /** API detail: `productName` */
  productName?: string;
  /** Alias lama / kompatibel */
  name?: string;
  unit: { code: string; name: string };
  /** API detail: `unitPrice` */
  unitPrice?: string;
  /** Alias lama / preview */
  sellPrice?: string;
  qty: string;
  lineTotal: string;
};

export function salesLineProductName(line: SalesInvoiceLine): string {
  return line.productName ?? line.name ?? "";
}

export function salesLineUnitPrice(line: SalesInvoiceLine): string {
  return line.unitPrice ?? line.sellPrice ?? "0";
}

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
