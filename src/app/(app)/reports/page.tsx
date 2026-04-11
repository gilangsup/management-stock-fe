"use client";

import { BarChart3, BookOpen, LineChart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <AppShell searchPlaceholder="Cari laporan…">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader
          title="Laporan"
          description="Modul laporan lanjutan dapat ditambahkan (ekspor agregat, grafik, dan lainnya)."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="surface-panel border-0 shadow-lg shadow-indigo-200/30">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                <BookOpen className="size-5" />
              </div>
              <CardTitle className="text-base">Dokumentasi API</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Data mentah tersedia melalui Swagger di{" "}
              <code className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                /docs
              </code>{" "}
              pada backend.
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-500/25">
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            <CardHeader className="relative flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/20">
                <LineChart className="size-5" />
              </div>
              <CardTitle className="text-base text-white">Grafik (rencana)</CardTitle>
            </CardHeader>
            <CardContent className="relative text-sm text-white/85">
              Siap untuk integrasi pustaka grafik — struktur dasbor sudah menampilkan indikator berwarna.
            </CardContent>
          </Card>
        </div>

        <Card className="border border-dashed border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-500/30 dark:bg-indigo-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-indigo-600 dark:text-indigo-400" />
              Ringkasan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400">
            Gunakan halaman Dasbor untuk indikator cepat dengan kartu statistik berwarna.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
