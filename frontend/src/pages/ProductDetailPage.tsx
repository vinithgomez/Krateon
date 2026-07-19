import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight, ImageOff, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ApiError, productApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { ProductResponse } from "@/types/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const [related, setRelated] = useState<ProductResponse[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setQuantity(1);

    productApi
      .getById(Number(id))
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          toast.error(error instanceof ApiError ? error.message : "Failed to load product.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!product) {
      setRelated([]);
      return;
    }

    let cancelled = false;
    setRelatedLoading(true);

    productApi
      .list({ categoryId: product.category.id, size: 5 })
      .then((result) => {
        if (cancelled) return;
        setRelated(result.content.filter((p) => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.info("Please log in to add items to your cart.");
      navigate("/login");
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(product.id, quantity);
      toast.success(`Added ${quantity} × ${product.name} to your cart.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <p className="text-lg font-medium">Product not found</p>
        <p className="text-muted-foreground">It may have been removed or the link is incorrect.</p>
        <Button variant="outline" className="mt-2" onClick={() => navigate("/")}>
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-muted p-10">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="size-full object-contain" />
          ) : (
            <ImageOff className="size-16 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit">
            {product.category.name}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</p>

          <Separator />

          <p className="leading-relaxed text-muted-foreground">
            {product.description || "No description available for this product."}
          </p>

          <div className="mt-2 flex flex-col gap-3">
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex w-fit items-center gap-1 rounded-full border">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-10 text-center text-base font-semibold">{quantity}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleAddToCart} disabled={addingToCart} size="lg" className="w-full">
            <ShoppingCart className="size-4" />
            {addingToCart ? "Adding..." : "Add to Cart"}
          </Button>
        </div>
      </div>

      {(relatedLoading || related.length > 0) && (
        <>
          <Separator />
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">You might also like</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                  ))
                : related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
