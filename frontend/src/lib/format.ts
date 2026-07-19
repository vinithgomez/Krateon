export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function orderStatusBadgeVariant(
  status: string,
): "secondary" | "outline" | "default" | "destructive" {
  switch (status) {
    case "CANCELLED":
      return "destructive";
    case "DELIVERED":
    case "SHIPPED":
      return "default";
    case "CONFIRMED":
      return "outline";
    default:
      return "secondary";
  }
}
