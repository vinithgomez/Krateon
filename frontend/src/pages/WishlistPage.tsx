import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { productApi } from "@/lib/api";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductResponse } from "@/types/api";

export function WishlistPage() {
  const { wishlist, loading: wishlistLoading } = useWishlist();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (!wishlist) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    let cancelled = false;
    setProductsLoading(true);

    // WishlistItemResponse only carries {id, name, price} - fetch the full product detail
    // for each item so ProductCard can render an image, category, rating, and variants.
    Promise.all(wishlist.items.map((item) => productApi.getById(item.product.id)))
      .then((results) => {
        if (!cancelled) setProducts(results);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wishlist]);

  const loading = wishlistLoading || productsLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Your Wishlist</h1>
        <p className="text-muted-foreground">
          Products you've saved for later. Click the heart on a product to remove it.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <p className="text-lg font-medium">Your wishlist is empty</p>
          <p className="text-muted-foreground">Tap the heart on any product to save it here.</p>
          <Button className="mt-2" nativeButton={false} render={<Link to="/" />}>
            Browse products
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
