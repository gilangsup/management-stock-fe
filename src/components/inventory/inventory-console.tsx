"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Hotel, Layers, Tags, Wheat } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { getStoredUser } from "@/lib/auth-storage";
import { FinishedProductsTab } from "./finished-products-tab";
import { HotelSellPricesTab } from "./hotel-sell-prices-tab";
import { MasterDataTab } from "./master-data-tab";
import { RawMaterialsTab } from "./raw-materials-tab";
import type { ApiListResponse, SnackCategoryRow, UnitRow } from "./types";

const MASTER_LIST_LIMIT = 100;

export function InventoryConsole() {
  /** Hanya dirender setelah AuthGuard (client); aman baca localStorage. */
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

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

  return (
    <AppShell searchPlaceholder="Cari bahan baku, barang jadi, satuan…">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Inventori"
          description="Bahan baku per satuan; barang jadi dengan harga pokok global; harga jual per hotel untuk bon/faktur. Master satuan dan kategori snack untuk kode otomatis."
        />

        <Tabs defaultValue="raw" className="gap-6">
          <TabsList
            variant="pill"
            className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-fit"
          >
            <TabsTrigger value="raw" className="gap-2">
              <Wheat className="size-4 opacity-80" />
              Bahan baku
            </TabsTrigger>
            <TabsTrigger value="finished" className="gap-2">
              <Tags className="size-4 opacity-80" />
              Barang jadi
            </TabsTrigger>
            <TabsTrigger value="hotel-prices" className="gap-2">
              <Hotel className="size-4 opacity-80" />
              Harga hotel
            </TabsTrigger>
            <TabsTrigger value="master" className="gap-2">
              <Layers className="size-4 opacity-80" />
              Master data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raw" className="mt-0">
            <RawMaterialsTab
              isAdmin={!!isAdmin}
              units={units.data?.data}
              unitsLoading={units.isLoading}
            />
          </TabsContent>
          <TabsContent value="finished" className="mt-0">
            <FinishedProductsTab
              isAdmin={!!isAdmin}
              categories={categories.data?.data}
              categoriesLoading={categories.isLoading}
            />
          </TabsContent>
          <TabsContent value="hotel-prices" className="mt-0">
            <HotelSellPricesTab isAdmin={!!isAdmin} />
          </TabsContent>
          <TabsContent value="master" className="mt-0">
            <MasterDataTab isAdmin={!!isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
