import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ApiError, inventoryApi, orderApi, productApi, restockRequestApi } from "@/lib/api";
import { ORDER_STATUSES } from "@/types/api";
import type { InventoryResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: number | null;
  tone?: "default" | "warning";
}

function SummaryCard({ icon: Icon, label, value, tone = "default" }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div
          className={
            tone === "warning"
              ? "flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              : "flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"
          }
        >
          <Icon className="size-5" />
        </div>
        <div>
          {value === null ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-semibold">{value}</p>}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [pendingRestockCount, setPendingRestockCount] = useState<number | null>(null);
  const [lowStockItems, setLowStockItems] = useState<InventoryResponse[] | null>(null);
  const [orderCounts, setOrderCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    productApi
      .list({ size: 1 })
      .then((r) => setProductCount(r.totalElements))
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to load product count."));

    restockRequestApi
      .list({ status: "PENDING", size: 1 })
      .then((r) => setPendingRestockCount(r.totalElements))
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to load restock requests."));

    inventoryApi
      .lowStock()
      .then(setLowStockItems)
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to load low-stock items."));

    Promise.all(ORDER_STATUSES.map((status) => orderApi.list({ status, size: 1 })))
      .then((results) => {
        const counts: Record<string, number> = {};
        ORDER_STATUSES.forEach((status, i) => {
          counts[status] = results[i].totalElements;
        });
        setOrderCounts(counts);
      })
      .catch((error: unknown) => toast.error(error instanceof ApiError ? error.message : "Failed to load order counts."));
  }, []);

  const totalOrders = orderCounts ? Object.values(orderCounts).reduce((sum, n) => sum + n, 0) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="A quick overview of the store." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Package} label="Products" value={productCount} />
        <SummaryCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={lowStockItems?.length ?? null}
          tone={lowStockItems && lowStockItems.length > 0 ? "warning" : "default"}
        />
        <SummaryCard icon={ClipboardList} label="Pending Restock Requests" value={pendingRestockCount} />
        <SummaryCard icon={ShoppingCart} label="Total Orders" value={totalOrders} />
      </div>

      {orderCounts && (
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((status) => (
                <Badge key={status} variant="secondary" className="gap-1.5 text-sm">
                  {status}
                  <span className="font-semibold">{orderCounts[status]}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockItems === null ? (
            <Skeleton className="h-32 w-full" />
          ) : lowStockItems.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Nothing is low on stock" description="All inventory is above its threshold." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell>{item.size === "ONE_SIZE" ? "One Size" : item.size}</TableCell>
                    <TableCell>{item.warehouse.name}</TableCell>
                    <TableCell className="text-destructive">{item.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{item.lowStockThreshold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
