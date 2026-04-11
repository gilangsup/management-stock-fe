import { AuthGuard } from "@/components/auth/auth-guard";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
