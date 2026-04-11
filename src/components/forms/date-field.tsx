"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
};

/** `value` dan `onChange` memakai format `yyyy-MM-dd` untuk API */
export function DateField({ value, onChange, placeholder = "Pilih tanggal", className }: Props) {
  const date = value ? new Date(value + "T12:00:00") : undefined;

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-10 w-full justify-start text-left font-normal",
          !value && "text-muted-foreground",
          className,
        )}
      >
        <CalendarIcon className="mr-2 size-4 shrink-0 opacity-60" />
        {value ? format(date!, "d MMM yyyy", { locale: localeId }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          locale={localeId}
          onSelect={(d) => {
            if (!d) return;
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            onChange(`${y}-${m}-${day}`);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
