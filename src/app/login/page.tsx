"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth-storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<{
        success: boolean;
        token?: string;
        user?: { id: string; email: string; name: string; role: string };
        error?: string;
      }>("/auth/login", { email, password });
      if (!data.success || !data.token || !data.user) {
        toast.error(data.error ?? "Login gagal");
        return;
      }
      setAuth(data.token, data.user);
      toast.success("Selamat datang");
      router.replace("/dashboard");
    } catch {
      toast.error("Tidak dapat menghubungi server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.22)_0%,transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(56,189,248,0.35)_0%,transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-10 flex items-center gap-4 text-white">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg shadow-black/10 ring-2 ring-white/25 backdrop-blur-sm">
          <Building2 className="size-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">Executive Architect</h1>
          <p className="text-sm font-medium text-white/85">Manajemen stok</p>
        </div>
      </div>

      <Card className="relative w-full max-w-md border-white/20 bg-white/90 shadow-2xl shadow-indigo-950/40 ring-1 ring-white/40 backdrop-blur-xl dark:bg-slate-900/90 dark:ring-white/10">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Masuk</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Gunakan akun yang sudah didaftarkan admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-indigo-400" />
                <Input
                  id="email"
                  className="h-11 border-indigo-100 pl-10 dark:border-indigo-500/20"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                Kata sandi
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-indigo-400" />
                <Input
                  id="password"
                  className="h-11 border-indigo-100 pl-10 dark:border-indigo-500/20"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full btn-gradient border-0 text-base font-semibold shadow-lg" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="relative mt-8 text-center text-xs text-white/70">
        Akses terbatas · hubungi admin untuk undangan akun
      </p>
    </div>
  );
}
