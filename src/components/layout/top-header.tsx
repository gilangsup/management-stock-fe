"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuth, getStoredUser } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Props = {
  searchPlaceholder?: string;
  onOpenMobileNav?: () => void;
};

export function TopHeader({ searchPlaceholder = "Cari…", onOpenMobileNav }: Props) {
  const router = useRouter();
  const user = getStoredUser();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/80 px-4 shadow-sm backdrop-blur-md sm:gap-4 sm:px-6 dark:bg-card/70">
      {onOpenMobileNav ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-foreground lg:hidden"
          onClick={onOpenMobileNav}
          aria-label="Buka menu"
        >
          <Menu className="size-5" />
        </Button>
      ) : null}

      <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xl">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-full border-border bg-background pl-10 shadow-inner placeholder:text-muted-foreground focus-visible:ring-ring/40 dark:bg-card"
          placeholder={searchPlaceholder}
          readOnly
        />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
          disabled
        >
          <Bell className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
          disabled
        >
          <Settings className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "ml-0 gap-2 rounded-full px-1.5 hover:bg-muted sm:ml-2 sm:px-2",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-border">
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden max-w-[140px] truncate text-left text-sm md:block">
              <span className="block font-medium leading-tight text-foreground">
                {user?.name ?? "Pengguna"}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                clearAuth();
                router.replace("/login");
              }}
            >
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
