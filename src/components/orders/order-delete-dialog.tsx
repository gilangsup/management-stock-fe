"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";

export type DeleteTarget = { id: string; poNumber: string | null };

type Props = {
  target: DeleteTarget | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export function OrderDeleteDialog({ target, onClose, onDeleted }: Props) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/daily-orders/${id}`),
    onSuccess: () => {
      toast.success("Pesanan dihapus");
      qc.invalidateQueries({ queryKey: ["daily-orders"] });
      onClose();
      onDeleted?.();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Gagal menghapus pesanan")),
  });

  return (
    <Dialog open={Boolean(target)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hapus pesanan?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {target?.poNumber ? (
            <>
              Pesanan <strong className="text-foreground">{target.poNumber}</strong> dan
              semua item-nya akan dihapus permanen.
            </>
          ) : (
            "Pesanan dan semua item-nya akan dihapus permanen."
          )}{" "}
          Tindakan ini tidak bisa dibatalkan.
        </p>
        <DialogFooter>
          <Button variant="outline" disabled={del.isPending} onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={del.isPending}
            onClick={() => target && del.mutate(target.id)}
          >
            {del.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Menghapus…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                Hapus
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
