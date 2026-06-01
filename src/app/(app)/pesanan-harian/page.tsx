"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChefHat, ClipboardList, Plus, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { pageStackWide } from "@/lib/page-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { getStoredUser } from "@/lib/auth-storage";
import type { DailyOrderDetail } from "@/components/inventory/types";

import { DailyOrderFormDialog } from "@/components/orders/daily-order-form-dialog";
import { OrderDetailModal } from "@/components/orders/order-detail-modal";
import { OrderDeleteDialog } from "@/components/orders/order-delete-dialog";
import type { DeleteTarget } from "@/components/orders/order-delete-dialog";
import { RekapPesananTab } from "@/components/orders/rekap-pesanan-tab";
import { InstruksiDapurTab } from "@/components/orders/instruksi-dapur-tab";
import { DaftarVendorTab } from "@/components/orders/daftar-vendor-tab";

export default function PesananHarianPage() {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isAdmin = useMemo(() => getStoredUser()?.role === "admin", []);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<DailyOrderDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);

  // Shared date for Instruksi Dapur & Daftar Vendor tabs
  const [viewDate, setViewDate] = useState(today);

  // ── Load detail for inline edit from table row ────────────────────────────
  async function openEditFromRow(id: string) {
    setEditLoadingId(id);
    try {
      const { data } = await api.get<{ data: DailyOrderDetail }>(`/daily-orders/${id}`);
      setEditData(data.data);
      setFormOpen(true);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal memuat pesanan"));
    } finally {
      setEditLoadingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell searchPlaceholder="Pesanan harian…">
      <div className={pageStackWide}>
        <PageHeader
          title="Pesanan Harian"
          description="Kelola PO dari hotel, instruksi dapur, dan daftar pembelian vendor."
        >
          <Button
            type="button"
            className="btn-gradient w-full border-0 sm:w-auto"
            onClick={() => {
              setEditData(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Tambah pesanan
          </Button>
        </PageHeader>

        <Tabs defaultValue="rekap">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="rekap" className="flex-1 sm:flex-none">
              <ClipboardList className="mr-1.5 size-3.5" />
              Rekap pesanan
            </TabsTrigger>
            <TabsTrigger value="dapur" className="flex-1 sm:flex-none">
              <ChefHat className="mr-1.5 size-3.5" />
              Instruksi dapur
            </TabsTrigger>
            <TabsTrigger value="vendor" className="flex-1 sm:flex-none">
              <ShoppingBag className="mr-1.5 size-3.5" />
              Daftar beli vendor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rekap" className="mt-4">
            <RekapPesananTab
              isAdmin={isAdmin}
              editLoadingId={editLoadingId}
              onDetail={(id) => setDetailId(id)}
              onEdit={(id) => openEditFromRow(id)}
              onDelete={(target) => setDeleteTarget(target)}
            />
          </TabsContent>

          <TabsContent value="dapur" className="mt-4">
            <InstruksiDapurTab
              viewDate={viewDate}
              onViewDateChange={setViewDate}
            />
          </TabsContent>

          <TabsContent value="vendor" className="mt-4">
            <DaftarVendorTab
              viewDate={viewDate}
              onViewDateChange={setViewDate}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}

      <DailyOrderFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditData(null);
        }}
        editData={editData}
        onSuccess={() => { /* invalidation handled inside dialog */ }}
      />

      <OrderDetailModal
        orderId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        onEdit={(order) => {
          setDetailId(null);
          setEditData(order);
          setFormOpen(true);
        }}
        onDeleted={() => setDetailId(null)}
        onInvoiced={(invoiceId) => router.push(`/penjualan/${invoiceId}`)}
      />

      <OrderDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
