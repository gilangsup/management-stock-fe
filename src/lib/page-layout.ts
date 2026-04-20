import { cn } from "@/lib/utils";

/** Lebar konten standar (tanpa `space-y` — untuk layout flex seperti Master Data + konten). */
export const pageMaxWide = "mx-auto w-full max-w-6xl";

export const pageMaxNarrow = "mx-auto w-full max-w-4xl";

/**
 * Pola lebar & jarak vertikal konsisten untuk konten halaman di bawah AppShell.
 */
export const pageStackWide = cn(pageMaxWide, "space-y-6 sm:space-y-8");

export const pageStackNarrow = cn(pageMaxNarrow, "space-y-6 sm:space-y-8");
