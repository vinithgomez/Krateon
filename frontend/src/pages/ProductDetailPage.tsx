import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronRight, Heart, ImageOff, Minus, Plus, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { ApiError, orderApi, productApi, reviewApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import { getMyReview, setMyReview } from "@/lib/myReviews";
import { cn } from "@/lib/utils";
import type { ProductResponse, ReviewResponse } from "@/types/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import { SizeSelector, isSingleOneSize } from "@/components/SizeSelector";
import { StarRating, InteractiveStarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const REVIEWS_PAGE_SIZE = 5;

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isWishlisted, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlist();

  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [wishlistPending, setWishlistPending] = useState(false);

  const [related, setRelated] = useState<ProductResponse[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isEditingOwnReview, setIsEditingOwnReview] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setQuantity(1);
    setSelectedVariantId(null);
    setReviewsPage(0);

    productApi
      .getById(Number(id))
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        addRecentlyViewed(data.id);

        if (isSingleOneSize(data.variants) || data.variants.length === 1) {
          setSelectedVariantId(data.variants[0].id);
        }

        const myReview = getMyReview(data.id);
        if (myReview) {
          setReviewRating(myReview.rating);
          setReviewComment(myReview.comment ?? "");
          setIsEditingOwnReview(true);
        } else {
          setReviewRating(0);
          setReviewComment("");
          setIsEditingOwnReview(false);
        }
        setReviewError(null);
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

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setReviewsLoading(true);

    reviewApi
      .list(product.id, reviewsPage, REVIEWS_PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setReviews(result.content);
        setReviewsTotalPages(result.totalPages);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load reviews.");
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product, reviewsPage]);

  const refreshProduct = async () => {
    if (!product) return;
    try {
      const data = await productApi.getById(product.id);
      setProduct(data);
    } catch {
      // Rating refresh is a nice-to-have; the review itself already succeeded.
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.info("Please log in to add items to your cart.");
      navigate("/login");
      return;
    }

    if (!selectedVariantId) {
      toast.error("Please select a size first.");
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(selectedVariantId, quantity);
      toast.success(`Added ${quantity} × ${product.name} to your cart.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.info("Please log in to continue.");
      navigate("/login");
      return;
    }

    if (!selectedVariantId) {
      toast.error("Please select a size first.");
      return;
    }

    setBuyingNow(true);
    try {
      const result = await orderApi.buyNow({ productVariantId: selectedVariantId, quantity });
      navigate("/checkout", { state: { result } });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to place order.");
    } finally {
      setBuyingNow(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast.info("Please log in to use your wishlist.");
      navigate("/login");
      return;
    }

    const wishlisted = isWishlisted(product.id);
    setWishlistPending(true);
    try {
      if (wishlisted) {
        await removeFromWishlist(product.id);
        toast.success("Removed from your wishlist.");
      } else {
        await addToWishlist(product.id);
        toast.success("Added to your wishlist.");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update your wishlist.");
    } finally {
      setWishlistPending(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (reviewRating < 1) {
      setReviewError("Please select a star rating.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const payload = { rating: reviewRating, comment: reviewComment.trim() || null };
      const response = isEditingOwnReview
        ? await reviewApi.update(product.id, payload)
        : await reviewApi.create(product.id, payload);

      setMyReview(product.id, { rating: response.rating, comment: response.comment });
      setIsEditingOwnReview(true);
      toast.success(isEditingOwnReview ? "Your review has been updated." : "Thanks for your review!");

      setReviewsPage(0);
      void refreshProduct();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setReviewError(error.message);
      } else {
        toast.error(error instanceof ApiError ? error.message : "Failed to submit your review.");
      }
    } finally {
      setReviewSubmitting(false);
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

  const wishlisted = isWishlisted(product.id);
  const needsSizeSelection = !isSingleOneSize(product.variants) && product.variants.length > 0;
  const canPurchase = selectedVariantId !== null;

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
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-muted p-10">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="size-full object-contain" />
          ) : (
            <ImageOff className="size-16 text-muted-foreground" />
          )}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-3 right-3 rounded-full shadow-md"
            disabled={wishlistPending}
            onClick={handleToggleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={cn("size-4", wishlisted && "fill-destructive text-destructive")} />
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit">
            {product.category.name}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.averageRating} />
              <span className="text-sm text-muted-foreground">
                {product.averageRating.toFixed(1)} · {product.reviewCount}{" "}
                {product.reviewCount === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}

          <p className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</p>

          <Separator />

          <p className="leading-relaxed text-muted-foreground">
            {product.description || "No description available for this product."}
          </p>

          {needsSizeSelection && (
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Size</span>
              <SizeSelector variants={product.variants} selectedId={selectedVariantId} onSelect={setSelectedVariantId} />
            </div>
          )}

          {product.variants.length === 0 && (
            <p className="text-sm text-muted-foreground">This product isn't currently available.</p>
          )}

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

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleAddToCart}
              disabled={addingToCart || buyingNow || !canPurchase}
              size="lg"
              className="flex-1"
            >
              <ShoppingCart className="size-4" />
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
            <Button
              onClick={handleBuyNow}
              disabled={addingToCart || buyingNow || !canPurchase}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              <Zap className="size-4" />
              {buyingNow ? "Placing order..." : "Buy Now"}
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold">Customer Reviews</h2>

        {isAuthenticated ? (
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h3 className="font-medium">{isEditingOwnReview ? "Update your review" : "Write a review"}</h3>
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3">
                <InteractiveStarRating value={reviewRating} onChange={setReviewRating} />
                <Textarea
                  placeholder="Share your thoughts about this product (optional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={2000}
                />
                {reviewError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{reviewError}</p>
                )}
                <Button type="submit" disabled={reviewSubmitting} className="w-fit">
                  {reviewSubmitting ? "Submitting..." : isEditingOwnReview ? "Update Review" : "Submit Review"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Log in
            </Link>{" "}
            to write a review.
          </div>
        )}

        {reviewsLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet - be the first to share your thoughts.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{review.userName || "Verified Buyer"}</span>
                      <Badge variant="secondary" className="text-[0.7rem] font-normal">
                        Verified Buyer
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {reviewsTotalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={cn("rounded-full", reviewsPage === 0 && "pointer-events-none opacity-50")}
                  onClick={(e) => {
                    e.preventDefault();
                    if (reviewsPage > 0) setReviewsPage((p) => p - 1);
                  }}
                />
              </PaginationItem>
              {Array.from({ length: reviewsTotalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    isActive={i === reviewsPage}
                    className={cn(
                      "rounded-full",
                      i === reviewsPage && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      setReviewsPage(i);
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
                    reviewsPage === reviewsTotalPages - 1 && "pointer-events-none opacity-50",
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    if (reviewsPage < reviewsTotalPages - 1) setReviewsPage((p) => p + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </section>

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
