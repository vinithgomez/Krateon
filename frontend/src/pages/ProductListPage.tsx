import { useEffect, useState } from "react";
import { PackageSearch, Search, X } from "lucide-react";
import { toast } from "sonner";
import { categoryApi, productApi } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CategoryResponse, ProductResponse } from "@/types/api";
import { ProductCard } from "@/components/ProductCard";
import { BestSellersSection } from "@/components/BestSellersSection";
import { RecentlyViewedSection } from "@/components/RecentlyViewedSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 12;
const ALL_CATEGORIES = "all";

export function ProductListPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});

  useEffect(() => {
    let cancelled = false;

    categoryApi
      .list()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        // Category filter is a nice-to-have; browsing still works without it.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    productApi
      .list({
        page,
        size: PAGE_SIZE,
        categoryId: categoryId === ALL_CATEGORIES ? undefined : Number(categoryId),
        keyword: keyword || undefined,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
      })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiError ? error.message : "Failed to load products.";
        toast.error(message);
        setProducts([]);
        setTotalPages(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, categoryId, keyword, priceRange]);

  const applyFilters = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
    setPriceRange({
      min: minPriceInput ? Number(minPriceInput) : undefined,
      max: maxPriceInput ? Number(maxPriceInput) : undefined,
    });
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setPage(0);
  };

  const clearFilters = () => {
    setKeywordInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setCategoryId(ALL_CATEGORIES);
    setKeyword("");
    setPriceRange({});
    setPage(0);
  };

  const hasActiveFilters =
    categoryId !== ALL_CATEGORIES || keyword !== "" || priceRange.min !== undefined || priceRange.max !== undefined;

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-20">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex max-w-2xl flex-col gap-4">
          <Badge variant="secondary" className="w-fit bg-primary-foreground/10 text-primary-foreground">
            Welcome to Krateon
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Everything you need, all in one place.
          </h1>
          <p className="text-base text-primary-foreground/70 sm:text-lg">
            Browse our full catalog of quality products, organized by category and always in stock.
          </p>
        </div>
      </section>

      {!hasActiveFilters && page === 0 && <BestSellersSection />}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Button
          type="button"
          variant={categoryId === ALL_CATEGORIES ? "default" : "outline"}
          className="shrink-0 rounded-full"
          onClick={() => selectCategory(ALL_CATEGORIES)}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            type="button"
            variant={categoryId === String(category.id) ? "default" : "outline"}
            className="shrink-0 rounded-full"
            onClick={() => selectCategory(String(category.id))}
          >
            {category.name}
          </Button>
        ))}
      </div>

      <form
        onSubmit={applyFilters}
        className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:gap-3"
      >
        <div className="flex flex-1 min-w-56 flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="keyword">
            Keyword
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="keyword"
              placeholder="Search by name..."
              className="pl-8"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Price range</label>
          <div className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5">
            <Input
              type="number"
              min={0}
              placeholder="Min"
              aria-label="Minimum price"
              className="h-6 w-16 border-0 p-0 shadow-none focus-visible:ring-0"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              min={0}
              placeholder="Max"
              aria-label="Maximum price"
              className="h-6 w-16 border-0 p-0 shadow-none focus-visible:ring-0"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">
            <Search className="size-4" />
            Search
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="secondary" className="rounded-full" onClick={clearFilters}>
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <PackageSearch className="size-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">No products found</p>
          <p className="max-w-sm text-muted-foreground">
            Try adjusting your filters or search keyword to find what you're looking for.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-2 rounded-full" onClick={clearFilters}>
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className={cn("rounded-full", page === 0 && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 0) setPage((p) => p - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={i === page}
                      className={cn(
                        "rounded-full",
                        i === page && "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(i);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className={cn(
                      "rounded-full",
                      page === totalPages - 1 && "pointer-events-none opacity-50",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages - 1) setPage((p) => p + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      {!hasActiveFilters && page === 0 && <RecentlyViewedSection />}
    </div>
  );
}
