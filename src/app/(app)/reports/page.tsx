"use client";

import { BarChart3, BookOpen, LineChart } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { pageStackNarrow } from "@/lib/page-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <AppShell searchPlaceholder="Cari laporan…">
      <div className={pageStackNarrow}>
        <PageHeader
          title="Laporan"
          description="Modul laporan lanjutan dapat ditambahkan (ekspor agregat, grafik, dan lainnya)."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="surface-panel border-0">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <BookOpen className="size-5" />
              </div>
              <CardTitle className="text-base">Dokumentasi API</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Data mentah tersedia melalui Swagger di{" "}
              <code className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                /docs
              </code>{" "}
              pada backend.
            </CardContent>
          </Card>

          <Card className="surface-panel border border-primary/15">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <LineChart className="size-5" />
              </div>
              <CardTitle className="text-base">Grafik (rencana)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Siap untuk integrasi pustaka grafik — struktur dasbor sudah menampilkan indikator berwarna.
            </CardContent>
          </Card>
        </div>

        <Card className="border border-dashed border-border bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-muted-foreground" />
              Ringkasan
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gunakan halaman Dasbor untuk indikator cepat.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
