import { useEffect, useState } from "react";
import { PackageSearch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ApiError, orderApi } from "@/lib/api";
import { formatCurrency, formatDate, orderStatusBadgeVariant } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ORDER_STATUSES } from "@/types/api";
import type { CheckoutResponse, OrderStatus, OrderSummaryResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
const ALL_STATUS = "ALL";

function UpdateStatusDialog({ order, onUpdated }: { order: OrderSummaryResponse; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus>(order.status);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckoutResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await orderApi.updateStatus(order.id, { status: nextStatus });
      setResult(response);
      toast.success(`Order #${order.id} is now ${response.status}.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update order status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          if (result) onUpdated();
          setResult(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <RefreshCw className="size-3.5" />
        Update Status
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order #{order.id}</DialogTitle>
          <DialogDescription>Current status: {order.status}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Status updated to <Badge variant={orderStatusBadgeVariant(result.status)}>{result.status}</Badge>
            </p>
            <div className="flex flex-col gap-1.5 rounded-lg border p-3">
              {result.items.map((item) => (
                <div key={item.productVariantId} className="flex items-center justify-between text-sm">
                  <span>
                    {item.productName} ({item.size === "ONE_SIZE" ? "One Size" : item.size}) × {item.quantity}
                  </span>
                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatCurrency(result.totalAmount)}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>New Status</Label>
              <Select value={nextStatus} onValueChange={(value) => value && setNextStatus(value as OrderStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummaryResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);

  const loadOrders = () => {
    setLoading(true);
    orderApi
      .list({ status: statusFilter === ALL_STATUS ? undefined : (statusFilter as OrderStatus), page, size: PAGE_SIZE })
      .then((result) => {
        setOrders(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load orders.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadOrders, [page, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Orders" description="All customer orders." />

      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Note: the backend doesn't expose which customer placed an order, or a way to view an order's
        line items without changing its status - only the summary fields below are available for browsing.
      </div>

      <div className="flex max-w-56 flex-col gap-1.5">
        <Label>Status</Label>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (!v) return;
            setStatusFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>All statuses</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No orders found" />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      <Badge variant={orderStatusBadgeVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <UpdateStatusDialog order={order} onUpdated={loadOrders} />
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
                    className={cn(page === totalPages - 1 && "pointer-events-none opacity-50")}
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
    </div>
  );
}
