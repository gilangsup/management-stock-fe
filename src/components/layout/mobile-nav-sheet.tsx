"use client";

import { usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { MainNavBrand, MainNavFooter, MainNavLinks } from "./main-nav";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNavSheet({ open, onOpenChange }: Props) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton
        className="flex w-[min(20rem,calc(100vw-1rem))] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-black/25 sm:max-w-sm"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <MainNavBrand />
        </div>
        <MainNavLinks pathname={pathname} onNavigate={() => onOpenChange(false)} />
        <MainNavFooter className="mt-auto" />
      </SheetContent>
    </Sheet>
  );
}
