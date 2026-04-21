"use client";

import { usePathname } from "next/navigation";
import { MainNavBrand, MainNavFooter, MainNavLinks } from "./main-nav";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm shadow-black/20 lg:flex">
      <div className="relative flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <MainNavBrand />
      </div>
      <MainNavLinks pathname={pathname} />
      <MainNavFooter />
    </aside>
  );
}
