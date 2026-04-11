import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  blue: {
    ring: "ring-blue-500/20",
    icon: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/35",
    bar: "from-sky-500 to-blue-600",
  },
  violet: {
    ring: "ring-violet-500/20",
    icon: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/35",
    bar: "from-violet-500 to-purple-600",
  },
  emerald: {
    ring: "ring-emerald-500/20",
    icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/35",
    bar: "from-emerald-500 to-teal-600",
  },
  amber: {
    ring: "ring-amber-500/25",
    icon: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/35",
    bar: "from-amber-500 to-orange-500",
  },
} as const;

export type StatTone = keyof typeof tones;

type Props = {
  label: string;
  icon: LucideIcon;
  tone: StatTone;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, icon: Icon, tone, children, footer, className }: Props) {
  const t = tones[tone];
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-white/60 bg-white/90 shadow-md shadow-slate-200/60 ring-1 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none",
        t.ring,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-90",
          t.bar,
        )}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </CardTitle>
        <div className={cn("flex size-9 items-center justify-center rounded-xl", t.icon)}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
          {children}
        </div>
        {footer ? (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{footer}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
