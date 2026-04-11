import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, children, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          <span
            className="hidden h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-500 via-blue-600 to-violet-600 shadow-sm shadow-blue-500/40 sm:block"
            aria-hidden
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
