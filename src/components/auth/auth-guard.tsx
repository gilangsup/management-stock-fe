"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, getStoredUser } from "@/lib/auth-storage";
import { STAFF_ALLOWED_PATHS } from "@/components/layout/main-nav";

/** Periksa apakah pathname diizinkan untuk role staff. */
function isPathAllowedForStaff(pathname: string): boolean {
  return STAFF_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    const user = getStoredUser();
    if (user?.role === "staff" && !isPathAllowedForStaff(pathname)) {
      router.replace("/expenses");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate client-only setelah cek token
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-background">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
          <span className="size-6 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Memuat aplikasi…</p>
      </div>
    );
  }

  return <>{children}</>;
}
