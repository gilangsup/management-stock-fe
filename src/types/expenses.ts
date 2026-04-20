/** Respons sukses `POST /api/expenses/batch` — selaras dengan backend. */
export type ExpensePurchaseRowApi = {
  id: string;
  expenseDate: string;
  rawMaterial: {
    id: string;
    name: string;
    itemCode: string | null;
    unit: { id?: string; code: string; name: string };
  };
  qty: string;
  unitPrice: string;
  totalPrice: string;
  notes: string | null;
  createdAt?: string;
};

export type ExpenseBatchSuccessResponse = {
  success: true;
  data: {
    count: number;
    ids: string[];
    expenses: ExpensePurchaseRowApi[];
  };
};
