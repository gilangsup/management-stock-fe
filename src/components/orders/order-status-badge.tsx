import { Badge } from "@/components/ui/badge";

type Props = { status: "draft" | "confirmed" };

export function OrderStatusBadge({ status }: Props) {
  return status === "confirmed" ? (
    <Badge className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100">
      Confirmed
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Draft
    </Badge>
  );
}
