"use client";

import { AppSidebar } from "./app-sidebar";
import { TopHeader } from "./top-header";

type Props = {
  children: React.ReactNode;
  searchPlaceholder?: string;
};

export function AppShell({ children, searchPlaceholder }: Props) {
  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-violet-100/50 dark:from-slate-950 dark:via-indigo-950/30 dark:to-violet-950/40">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-sky-400/25 to-blue-500/20 blur-3xl" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-violet-400/20 to-fuchsia-400/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-gradient-to-tl from-emerald-400/15 to-cyan-400/10 blur-3xl" />
      </div>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader searchPlaceholder={searchPlaceholder} />
        <main className="relative flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
