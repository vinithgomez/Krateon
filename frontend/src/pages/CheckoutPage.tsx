import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { ApiError, orderApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { CheckoutResponse } from "@/types/api";

type Status = "processing" | "success" | "error";

export function CheckoutPage() {
  const { refresh } = useCart();
  const location = useLocation();
  // Buy Now bypasses the cart entirely and already has a completed CheckoutResponse by
  // the time it navigates here - in that case we just render it, no API call needed.
  const buyNowResult = (location.state as { result?: CheckoutResponse } | null)?.result ?? null;

  const [status, setStatus] = useState<Status>(buyNowResult ? "success" : "processing");
  const [result, setResult] = useState<CheckoutResponse | null>(buyNowResult);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cart checkout is a real, side-effecting mutation (deducts stock, creates an order),
  // so it must fire exactly once per visit even though React 19's StrictMode
  // intentionally double-invokes effects in development.
  const hasRun = useRef(false);

  useEffect(() => {
    if (buyNowResult) return;
    if (hasRun.current) return;
    hasRun.current = true;

    orderApi
      .checkout()
      .then((data) => {
        setResult(data);
        setStatus("success");
        void refresh();
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof ApiError ? error.message : "Checkout failed. Please try again.");
        setStatus("error");
      });
  }, [refresh, buyNowResult]);

  if (status === "processing") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <Skeleton className="h-8 w-48" />
        <p className="text-muted-foreground">Placing your order...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <XCircle className="size-12 text-destructive" />
        <h1 className="text-xl font-semibold">Checkout failed</h1>
        <p className="text-muted-foreground">{errorMessage}</p>
        <Button nativeButton={false} render={<Link to="/cart" />}>
          Back to cart
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-12 text-green-600" />
        <h1 className="text-xl font-semibold">Order placed!</h1>
        <p className="text-muted-foreground">Thank you for your purchase.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Order #{result?.orderId}</span>
            <Badge variant="secondary">{result?.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {result?.items.map((item) => (
            <div key={item.productVariantId} className="flex items-center justify-between text-sm">
              <span>
                {item.productName} ({item.size === "ONE_SIZE" ? "One Size" : item.size}) × {item.quantity}
              </span>
              <span className="font-medium">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
            <span>Total</span>
            <span>{result ? formatCurrency(result.totalAmount) : ""}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-3">
        <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
          Continue shopping
        </Button>
        <Button nativeButton={false} render={<Link to={`/orders/${result?.orderId}`} />}>
          View order
        </Button>
      </div>
    </div>
  );
}
