"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Mail } from "lucide-react";
import Image from "next/image";
import logoSoka from "@/assets/logo_soka.png";
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#5a6d82] via-[#4a5c6e] to-[#3d4d5f]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08)_0%,transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mb-10 flex items-center gap-4 text-white">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 ring-1 ring-white/20 shadow-lg">
          <Image src={logoSoka} alt="Soka Frozen" width={52} height={52} className="object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">Soka Frozen</h1>
          <p className="text-sm font-medium text-white/85">Manajemen stok</p>
        </div>
      </div>

      <Card className="relative w-full max-w-md border-white/20 bg-white/96 shadow-lg shadow-black/10 ring-1 ring-white/25 backdrop-blur-sm dark:bg-card/95 dark:ring-border">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-xl font-bold text-foreground">Masuk</CardTitle>
          <CardDescription className="text-muted-foreground">
            Gunakan akun yang sudah didaftarkan admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  className="h-11 border-border pl-10"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Kata sandi
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  className="h-11 border-border pl-10"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full btn-gradient border-0 text-base font-semibold" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="relative mt-8 text-center text-xs text-white/55">
        Akses terbatas · hubungi admin untuk undangan akun
      </p>
    </div>
  );
}
