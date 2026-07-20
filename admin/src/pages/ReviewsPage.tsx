import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError, productApi, reviewApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductResponse, ReviewResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export function ReviewsPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [productId, setProductId] = useState("");

  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productApi.list({ size: 100 }).then((r) => setProducts(r.content)).catch(() => {});
  }, []);

  const loadReviews = (id: number, targetPage: number) => {
    setLoading(true);
    reviewApi
      .listForProduct(id, targetPage, PAGE_SIZE)
      .then((result) => {
        setReviews(result.content);
        setTotalPages(result.totalPages);
        setPage(targetPage);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load reviews.");
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    try {
      await reviewApi.remove(id);
      toast.success("Review deleted.");
      loadReviews(Number(productId), page);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to delete review.");
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reviews" description="Moderate customer reviews." />

      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Note: there's no backend endpoint to list all reviews across every product - only
        GET /api/products/{"{"}id{"}"}/reviews (per-product) exists. Select a product below to browse
        its reviews. If you want to moderate reviews without knowing product ids upfront, a
        "list all reviews" admin endpoint would need to be added to the backend.
      </div>

      <div className="flex max-w-sm flex-col gap-1.5">
        <Label>Product</Label>
        <Select
          value={productId}
          onValueChange={(value) => {
            if (!value) return;
            setProductId(value);
            loadReviews(Number(value), 0);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a product to view its reviews" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={String(product.id)}>
                {product.name} {product.reviewCount > 0 ? `(${product.reviewCount})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!productId ? (
        <p className="text-sm text-muted-foreground">Select a product above to see its reviews.</p>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews for this product" />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rating</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {review.rating}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{review.userName || "Verified Buyer"}</TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">{review.comment || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(review.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <ConfirmDeleteDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Delete review">
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        }
                        title="Delete this review?"
                        description={`This will permanently remove ${review.userName || "this user"}'s review.`}
                        onConfirm={() => handleDelete(review.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className={cn(page === 0 && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 0) loadReviews(Number(productId), page - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={i === page}
                      onClick={(e) => {
                        e.preventDefault();
                        loadReviews(Number(productId), i);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className={cn(page === totalPages - 1 && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages - 1) loadReviews(Number(productId), page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
