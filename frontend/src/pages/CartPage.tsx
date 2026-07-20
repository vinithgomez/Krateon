import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function sizeLabel(size: string): string {
  return size === "ONE_SIZE" ? "One Size" : `Size ${size}`;
}

export function CartPage() {
  const { cart, loading, updateItemQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const [pendingVariantId, setPendingVariantId] = useState<number | null>(null);

  const handleQuantityChange = async (productVariantId: number, quantity: number) => {
    setPendingVariantId(productVariantId);
    try {
      await updateItemQuantity(productVariantId, quantity);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update quantity.");
    } finally {
      setPendingVariantId(null);
    }
  };

  const handleRemove = async (productVariantId: number) => {
    setPendingVariantId(productVariantId);
    try {
      await removeItem(productVariantId);
      toast.success("Item removed from cart.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to remove item.");
    } finally {
      setPendingVariantId(null);
    }
  };

  if (loading && !cart) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <p className="text-muted-foreground">Browse our products and add something you like.</p>
        <Button className="mt-2" nativeButton={false} render={<Link to="/" />}>
          Browse products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Your Cart</h1>

      <div className="flex flex-col gap-3">
        {cart.items.map((item) => {
          const isPending = pendingVariantId === item.productVariantId;
          return (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Package className="size-6 text-muted-foreground" />
                </div>

                <div className="min-w-40 flex-1">
                  <p className="font-medium">
                    {item.product.name} - {sizeLabel(item.size)}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.product.price)} each</p>
                </div>

                <div className="flex items-center rounded-lg border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending || item.quantity <= 1}
                    onClick={() => handleQuantityChange(item.productVariantId, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleQuantityChange(item.productVariantId, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                <p className="w-24 text-right font-semibold">{formatCurrency(item.subtotal)}</p>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleRemove(item.productVariantId)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="ml-auto w-full sm:w-80">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(cart.totalAmount)}</span>
          </div>
          <Separator />
          <Button size="lg" onClick={() => navigate("/checkout")}>
            Proceed to Checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
