"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiListResponse, SnackCategoryRow, UnitRow } from "./types";

const MASTER_LIST_LIMIT = 100;

/** Cache bersama untuk tab bahan baku & barang jadi (React Query dedupe). */
export function useInventoryMasters() {
  const units = useQuery({
    queryKey: ["master-units", "list"],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<UnitRow>>("/master/units", {
        params: { page: 1, limit: MASTER_LIST_LIMIT },
      });
      return data;
    },
    staleTime: 60_000,
  });

  const categories = useQuery({
    queryKey: ["master-snack-categories", "list"],
    queryFn: async () => {
      const { data } = await api.get<ApiListResponse<SnackCategoryRow>>(
        "/master/snack-categories",
        { params: { page: 1, limit: MASTER_LIST_LIMIT } },
      );
      return data;
    },
    staleTime: 60_000,
  });

  return { units, categories };
}
