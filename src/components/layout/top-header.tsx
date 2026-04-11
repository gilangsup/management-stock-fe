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
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-indigo-200/40 bg-white/70 px-6 shadow-sm shadow-indigo-100/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:shadow-none">
      <div className="relative max-w-xl flex-1">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-indigo-400" />
        <Input
          className="h-10 rounded-full border-indigo-200/60 bg-white/90 pl-10 shadow-inner shadow-indigo-100/30 placeholder:text-slate-400 focus-visible:ring-indigo-400/30 dark:border-white/10 dark:bg-slate-800/80"
          placeholder={searchPlaceholder}
          readOnly
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-indigo-600/70 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-300"
          disabled
        >
          <Bell className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-indigo-600/70 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-300"
          disabled
        >
          <Settings className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "ml-2 gap-2 rounded-full px-2 hover:bg-indigo-500/10",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-500/30">
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden text-left text-sm sm:block">
              <span className="block font-medium leading-tight text-slate-800 dark:text-slate-100">
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
