"use client";

import { AppSidebar } from "./app-sidebar";
import { TopHeader } from "./top-header";

type Props = {
  children: React.ReactNode;
  searchPlaceholder?: string;
};

export function AppShell({ children, searchPlaceholder }: Props) {
  return (
    <div className="relative flex min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -right-24 top-0 h-[320px] w-[320px] rounded-full bg-muted/40 blur-3xl" />
      </div>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader searchPlaceholder={searchPlaceholder} />
        <main className="relative flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
