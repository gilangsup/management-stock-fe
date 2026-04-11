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
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-100 via-indigo-50/50 to-violet-100/40">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-indigo-500/30">
          <span className="size-6 animate-pulse rounded-md bg-white/30" />
        </div>
        <p className="text-sm font-medium text-slate-600">Memuat aplikasi…</p>
      </div>
    );
  }

  return <>{children}</>;
}
