import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { ApiError, orderApi } from "@/lib/api";
import { formatCurrency, formatDate, orderStatusBadgeVariant } from "@/lib/format";
import type { OrderSummaryResponse } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderSummaryResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    orderApi
      .history(page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setOrders(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof ApiError ? error.message : "Failed to load order history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <PackageSearch className="size-10 text-muted-foreground" />
        <p className="text-lg font-medium">You have no orders yet</p>
        <p className="text-muted-foreground">Once you check out, your orders will show up here.</p>
        <Button className="mt-2" nativeButton={false} render={<Link to="/" />}>
          Browse products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Order history</h1>

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Order #{order.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.itemCount}{" "}
                    {order.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={orderStatusBadgeVariant(order.status)}>{order.status}</Badge>
                  <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                className={page === 0 ? "pointer-events-none opacity-50" : ""}
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
                className={page === totalPages - 1 ? "pointer-events-none opacity-50" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages - 1) setPage((p) => p + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
