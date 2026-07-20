import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { productApi } from "@/lib/api";
import { getRecentlyViewedIds } from "@/lib/recentlyViewed";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductResponse } from "@/types/api";

interface RecentlyViewedSectionProps {
  /** Excludes the product currently being viewed, if this is rendered on a detail page. */
  excludeProductId?: number;
}

export function RecentlyViewedSection({ excludeProductId }: RecentlyViewedSectionProps) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getRecentlyViewedIds().filter((id) => id !== excludeProductId);

    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.allSettled(ids.map((id) => productApi.getById(id)))
      .then((results) => {
        if (cancelled) return;
        const found = results
          .filter((r): r is PromiseFulfilledResult<ProductResponse> => r.status === "fulfilled")
          .map((r) => r.value);
        setProducts(found);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [excludeProductId]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <History className="size-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Recently Viewed</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-44 shrink-0 rounded-xl sm:w-52" />
            ))
          : products.map((product) => (
              <div key={product.id} className="w-44 shrink-0 sm:w-52">
                <ProductCard product={product} />
              </div>
            ))}
      </div>
    </section>
  );
}
