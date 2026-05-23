"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiListResponse, FinishedProductRow } from "./types";

const PAGE_LIMIT = 50;

type Props = {
  value: string;
  onChange: (finishedProductId: string) => void;
  /** Dipanggil saat produk dipilih — berguna untuk mengisi satuan default. */
  onProductSelect?: (product: FinishedProductRow | null) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  /** Tampilkan stok saat ini di daftar */
  showStock?: boolean;
};

export function FinishedProductCombobox({
  value,
  onChange,
  onProductSelect,
  disabled,
  placeholder = "Pilih barang jadi",
  id,
  showStock = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [picked, setPicked] = useState<FinishedProductRow | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!value) {
      setPicked(null);
      onProductSelect?.(null);
    }
  }, [value, onProductSelect]);

  const listQuery = useQuery({
    queryKey: ["finished-products", "combobox-search", debouncedQ],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: 1, limit: PAGE_LIMIT };
      if (debouncedQ) params.search = debouncedQ;
      const { data } = await api.get<ApiListResponse<FinishedProductRow>>("/finished-products", {
        params,
      });
      return data;
    },
    enabled: open,
    staleTime: 15_000,
  });

  const apiRows = listQuery.data?.data ?? [];
  const metaTotal = listQuery.data?.meta.total;

  const rows = useMemo(() => {
    const out = [...apiRows];
    if (picked && value && String(picked.id) === String(value)) {
      if (!out.some((r) => String(r.id) === String(value))) {
        out.unshift(picked);
      }
    }
    return out;
  }, [apiRows, picked, value]);

  const selected = useMemo(() => {
    if (!value) return null;
    if (picked && String(picked.id) === String(value)) return picked;
    return apiRows.find((x) => String(x.id) === String(value)) ?? null;
  }, [value, picked, apiRows]);

  const stockOf = (r: FinishedProductRow) =>
    typeof r.stockQuantity === "number" ? r.stockQuantity : Number(r.stockQuantity ?? 0);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQ("");
          setDebouncedQ("");
        } else {
          setQ("");
          setDebouncedQ("");
        }
      }}
    >
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        className={cn(
          "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="line-clamp-1">
          {open && listQuery.isFetching && !listQuery.data ? (
            "Memuat…"
          ) : selected ? (
            <>
              <span className="font-medium">{selected.name}</span>{" "}
              <span className="font-mono text-muted-foreground">({selected.itemCode})</span>
              {showStock ? (
                <span className="text-muted-foreground"> · stok {stockOf(selected)}</span>
              ) : null}
            </>
          ) : value ? (
            <span className="text-muted-foreground">Barang dipilih · ketuk untuk mengubah</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2 p-2"
        sideOffset={4}
      >
        <Input
          placeholder="Cari nama atau kode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9"
          autoComplete="off"
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground">Pencarian lewat server.</p>
        {listQuery.isError ? (
          <p className="px-2 py-4 text-center text-xs text-destructive">Gagal memuat barang jadi.</p>
        ) : (
          <ScrollArea className="h-[min(280px,50vh)]">
            <div className="flex flex-col gap-0.5 pr-2">
              {listQuery.isFetching && !listQuery.data ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">Memuat…</p>
              ) : rows.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {debouncedQ
                    ? "Tidak ada barang yang cocok."
                    : "Belum ada barang jadi di master."}
                </p>
              ) : (
                rows.map((r) => {
                  const idStr = String(r.id);
                  const active = idStr === String(value);
                  return (
                    <button
                      key={idStr}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                        active ? "bg-accent text-accent-foreground" : "hover:bg-muted/80",
                      )}
                      onClick={() => {
                        onChange(idStr);
                        setPicked(r);
                        onProductSelect?.(r);
                        setOpen(false);
                        setQ("");
                        setDebouncedQ("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-tight">{r.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.itemCode} · {r.snackCategory.name}
                          {r.unit?.code ? ` · ${r.unit.code}` : ""}
                          {showStock ? ` · stok ${stockOf(r)}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
        {metaTotal != null && apiRows.length > 0 && metaTotal > apiRows.length ? (
          <p className="text-[11px] text-muted-foreground">
            Menampilkan {apiRows.length} dari {metaTotal}. Persempit pencarian.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
