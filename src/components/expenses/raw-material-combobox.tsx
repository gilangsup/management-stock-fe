"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatIdr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiListResponse, RawMaterialRow } from "@/components/inventory/types";

const PAGE_LIMIT = 50;

type SearchScope = "__all__" | "name" | "itemCode";

type Props = {
  value: string;
  onChange: (rawMaterialId: string) => void;
  /** Dipanggil dengan baris penuh saat user memilih item (termasuk costPrice). */
  onSelect?: (row: RawMaterialRow) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
};

export function RawMaterialCombobox({
  value,
  onChange,
  onSelect,
  disabled,
  placeholder = "Pilih bahan baku",
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("__all__");
  const [picked, setPicked] = useState<RawMaterialRow | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!value) setPicked(null);
  }, [value]);

  const listQuery = useQuery({
    queryKey: ["raw-materials", "combobox-search", debouncedQ, searchScope],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: 1,
        limit: PAGE_LIMIT,
      };
      if (debouncedQ) {
        params.search = debouncedQ;
        if (searchScope === "name") params.searchBy = "name";
        if (searchScope === "itemCode") params.searchBy = "itemCode";
      }
      const { data } = await api.get<ApiListResponse<RawMaterialRow>>("/raw-materials", {
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

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQ("");
          setDebouncedQ("");
          setSearchScope("__all__");
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
              <span className="text-muted-foreground">
                ({selected.itemCode ?? "—"}) · {selected.unit.name}
              </span>
            </>
          ) : value ? (
            <span className="text-muted-foreground">Bahan baku dipilih · ketuk untuk mengubah</span>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Cari nama atau kode…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 flex-1"
            autoComplete="off"
            autoFocus
          />
          <Select
            value={searchScope}
            onValueChange={(v) => setSearchScope(v as SearchScope)}
          >
            <SelectTrigger
              className="h-9 w-full shrink-0 sm:w-[11rem]"
              aria-label="Ruang pencarian"
            >
              <SelectValue>
                {searchScope === "name"
                  ? "Hanya nama"
                  : searchScope === "itemCode"
                    ? "Hanya kode"
                    : "Nama atau kode"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Nama atau kode</SelectItem>
              <SelectItem value="name">Hanya nama</SelectItem>
              <SelectItem value="itemCode">Hanya kode</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pencarian lewat server. Kosongkan kotak untuk melihat halaman pertama.
        </p>
        {listQuery.isError ? (
          <p className="px-2 py-4 text-center text-xs text-destructive">Gagal memuat bahan baku.</p>
        ) : (
          <ScrollArea className="h-[min(280px,50vh)]">
            <div className="flex flex-col gap-0.5 pr-2">
              {listQuery.isFetching && !listQuery.data ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">Memuat…</p>
              ) : rows.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {debouncedQ
                    ? "Tidak ada bahan baku yang cocok."
                    : "Belum ada bahan baku. Tambahkan di Inventori → Bahan baku."}
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
                        onSelect?.(r);
                        setPicked(r);
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
                          {r.itemCode ?? "—"} · {r.unit.name} ({r.unit.code})
                          {Number(r.costPrice) > 0 && (
                            <> · <span className="text-primary/80">{formatIdr(r.costPrice)}/{r.unit.code}</span></>
                          )}
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
            Menampilkan {apiRows.length} dari {metaTotal}. Persempit kata kunci atau pilih &quot;Hanya
            nama/kode&quot;.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
