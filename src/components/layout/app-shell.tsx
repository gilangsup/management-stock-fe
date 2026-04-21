"use client";

import { useState } from "react";
import { AppSidebar } from "./app-sidebar";
import { MobileNavSheet } from "./mobile-nav-sheet";
import { TopHeader } from "./top-header";

type Props = {
  children: React.ReactNode;
  searchPlaceholder?: string;
};

export function AppShell({ children, searchPlaceholder }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <div className="relative flex min-h-screen bg-background">
        <div
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -right-24 top-0 h-[320px] w-[320px] rounded-full bg-muted/40 blur-3xl" />
        </div>
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader
            searchPlaceholder={searchPlaceholder}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
      <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
