import { Link, useNavigate } from "react-router-dom";
import { ImageOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import type { ProductResponse } from "@/types/api";

export function ProductCard({ product }: { product: ProductResponse }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info("Please log in to add items to your cart.");
      navigate("/login");
      return;
    }

    try {
      await addItem(product.id, 1);
      toast.success(`Added ${product.name} to your cart.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add item to cart.");
    }
  };

  return (
    <div className="group relative">
      <Link to={`/products/${product.id}`} className="block">
        <Card className="h-full gap-0 overflow-hidden py-0 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageOff className="size-10 text-muted-foreground" />
              </div>
            )}
          </div>
          <CardContent className="flex flex-1 flex-col gap-1.5 py-3">
            <Badge variant="secondary" className="w-fit text-[0.7rem] font-normal">
              {product.category.name}
            </Badge>
            <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">{product.name}</p>
            <span className="text-lg font-semibold">{formatCurrency(product.price)}</span>
          </CardContent>
        </Card>
      </Link>

      <Button
        type="button"
        size="icon"
        className="absolute top-2 right-2 z-10 rounded-full opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={handleQuickAdd}
        aria-label={`Add ${product.name} to cart`}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
