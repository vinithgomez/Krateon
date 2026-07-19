import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ApiError, orderApi } from "@/lib/api";
import { formatCurrency, formatDate, orderStatusBadgeVariant } from "@/lib/format";
import type { CheckoutResponse } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<CheckoutResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    orderApi
      .getById(Number(id))
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          toast.error(error instanceof ApiError ? error.message : "Failed to load order.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <p className="text-lg font-medium">Order not found</p>
        <p className="text-muted-foreground">
          It may not exist, or it may belong to a different account.
        </p>
        <Button variant="outline" className="mt-2" onClick={() => navigate("/orders")}>
          Back to order history
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/orders" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to order history
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
            <span>Order #{order.orderId}</span>
            <Badge variant={orderStatusBadgeVariant(order.status)}>{order.status}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted-foreground">
                  {item.quantity} × {formatCurrency(item.priceAtPurchase)}
                </p>
              </div>
              <span className="font-medium">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
