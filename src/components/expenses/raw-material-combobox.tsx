"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { RawMaterialRow } from "@/components/inventory/types";

type Props = {
  items: RawMaterialRow[];
  value: string;
  onChange: (rawMaterialId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  id?: string;
};

export function RawMaterialCombobox({
  items,
  value,
  onChange,
  disabled,
  loading,
  placeholder = "Pilih bahan baku",
  id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(
    () => items.find((x) => String(x.id) === String(value)),
    [items, value],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) => {
      const name = r.name.toLowerCase();
      const code = (r.itemCode ?? "").toLowerCase();
      const u = `${r.unit.name} ${r.unit.code}`.toLowerCase();
      return name.includes(s) || code.includes(s) || u.includes(s);
    });
  }, [items, q]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQ("");
      }}
    >
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled || loading}
        className={cn(
          "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="line-clamp-1">
          {loading ? (
            "Memuat…"
          ) : selected ? (
            <>
              <span className="font-medium">{selected.name}</span>{" "}
              <span className="text-muted-foreground">
                ({selected.itemCode ?? "—"}) · {selected.unit.name}
              </span>
            </>
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
          autoFocus
        />
        <ScrollArea className="h-[min(280px,50vh)]">
          <div className="flex flex-col gap-0.5 pr-2">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                Tidak ada bahan baku yang cocok.
              </p>
            ) : (
              filtered.map((r) => {
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
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <Check
                      className={cn("mt-0.5 size-4 shrink-0", active ? "opacity-100" : "opacity-0")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-tight">{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.itemCode ?? "—"} · {r.unit.name} ({r.unit.code})
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
