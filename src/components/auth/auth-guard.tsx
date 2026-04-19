"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth-storage";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate client-only setelah cek token
    setReady(true);
  }, [router]);

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
