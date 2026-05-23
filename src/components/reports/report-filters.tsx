"use client";

import { useMemo } from "react";
import { DateField } from "@/components/forms/date-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type DatePreset = "today" | "week" | "month" | "year" | "custom";

function startOfWeek(d: Date): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfYear(d: Date): string {
  return `${d.getFullYear()}-01-01`;
}

export function resolveDateRange(preset: DatePreset, customFrom: string, customTo: string): {
  from: string;
  to: string;
} {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  switch (preset) {
    case "today":
      return { from: to, to };
    case "week":
      return { from: startOfWeek(today), to };
    case "month":
      return { from: startOfMonth(today), to };
    case "year":
      return { from: startOfYear(today), to };
    default:
      return { from: customFrom, to: customTo };
  }
}

type Props = {
  preset: DatePreset;
  onPresetChange: (p: DatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
};

export function ReportDateFilter({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: Props) {
  const isCustom = preset === "custom";

  const rangeLabel = useMemo(() => {
    const { from, to } = resolveDateRange(preset, customFrom, customTo);
    return `${from} → ${to}`;
  }, [preset, customFrom, customTo]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>Periode</Label>
        <Select value={preset} onValueChange={(v) => onPresetChange(v as DatePreset)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hari ini</SelectItem>
            <SelectItem value="week">Minggu ini</SelectItem>
            <SelectItem value="month">Bulan ini</SelectItem>
            <SelectItem value="year">Tahun ini</SelectItem>
            <SelectItem value="custom">Kustom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isCustom ? (
        <>
          <div className="space-y-2">
            <Label>Dari</Label>
            <DateField value={customFrom} onChange={onCustomFromChange} />
          </div>
          <div className="space-y-2">
            <Label>Sampai</Label>
            <DateField value={customTo} onChange={onCustomToChange} />
          </div>
        </>
      ) : (
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label>Rentang aktif</Label>
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums">
            {rangeLabel}
          </p>
        </div>
      )}
    </div>
  );
}

export function ReportHotelFilter({
  hotelId,
  onHotelIdChange,
  hotels,
}: {
  hotelId: string;
  onHotelIdChange: (v: string) => void;
  hotels: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>Hotel</Label>
      <Select value={hotelId || "all"} onValueChange={(v) => onHotelIdChange(v === "all" ? "" : (v ?? ""))}>
        <SelectTrigger>
          <SelectValue placeholder="Semua hotel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua hotel</SelectItem>
          {hotels.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ReportResetButton({ onReset }: { onReset: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onReset}>
      Reset filter
    </Button>
  );
}
