import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { productApi } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductResponse } from "@/types/api";

export function BestSellersSection() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    productApi
      .bestSellers(8)
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-amber-50/50 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-amber-500" />
        <h2 className="text-xl font-semibold">Best Sellers</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-44 shrink-0 rounded-xl sm:w-52" />
            ))
          : products.map((product, i) => (
              <div key={product.id} className="w-44 shrink-0 sm:w-52">
                <ProductCard product={product} rank={i + 1} />
              </div>
            ))}
      </div>
    </section>
  );
}
