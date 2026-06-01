"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UnitRow } from "@/components/inventory/types";

type Props = {
  value: string;
  onChange: (unitId: string) => void;
  units: UnitRow[];
  disabled?: boolean;
  label?: string;
  id?: string;
};

export function UnitSelect({
  value,
  onChange,
  units,
  disabled,
  label = "Satuan",
  id,
}: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v ?? "")}
        disabled={disabled || !units.length}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={units.length ? "Pilih satuan" : "Memuat satuan…"} />
        </SelectTrigger>
        <SelectContent>
          {units.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>
              {u.code} — {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
