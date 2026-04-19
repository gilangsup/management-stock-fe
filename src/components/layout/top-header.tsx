"use client";

import { Bell, Search, Settings } from "lucide-react";
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

type Props = { searchPlaceholder?: string };

export function TopHeader({ searchPlaceholder = "Cari…" }: Props) {
  const router = useRouter();
  const user = getStoredUser();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card/80 px-6 shadow-sm backdrop-blur-md dark:bg-card/70">
      <div className="relative max-w-xl flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-full border-border bg-background pl-10 shadow-inner placeholder:text-muted-foreground focus-visible:ring-ring/40 dark:bg-card"
          placeholder={searchPlaceholder}
          readOnly
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
          disabled
        >
          <Bell className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
          disabled
        >
          <Settings className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "ml-2 gap-2 rounded-full px-2 hover:bg-muted",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-border">
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden text-left text-sm sm:block">
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
