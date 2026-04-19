import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  blue: {
    ring: "ring-border",
    icon: "bg-primary/12 text-primary",
    bar: "bg-primary/45",
  },
  violet: {
    ring: "ring-border",
    icon: "bg-muted text-foreground/80",
    bar: "bg-muted-foreground/25",
  },
  emerald: {
    ring: "ring-border",
    icon: "bg-success/12 text-success",
    bar: "bg-success/45",
  },
  amber: {
    ring: "ring-border",
    icon: "bg-destructive/10 text-destructive",
    bar: "bg-destructive/35",
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
        "relative overflow-hidden border-border bg-card shadow-sm ring-1 backdrop-blur-sm dark:bg-card/90",
        t.ring,
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-1 opacity-95", t.bar)} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn("flex size-9 items-center justify-center rounded-xl", t.icon)}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{children}</div>
        {footer ? <p className="mt-1 text-xs text-muted-foreground">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}
