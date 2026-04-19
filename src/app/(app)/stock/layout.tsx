import { StockLayoutClient } from "@/components/inventory/stock-layout-client";

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return <StockLayoutClient>{children}</StockLayoutClient>;
}
