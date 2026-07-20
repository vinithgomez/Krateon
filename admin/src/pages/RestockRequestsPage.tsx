import { useEffect, useState } from "react";
import { ClipboardCheck, ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { ApiError, productApi, productVariantApi, restockRequestApi, supplierApi, warehouseApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ProductResponse,
  ProductVariantResponse,
  RestockRequestResponse,
  RestockStatus,
  SupplierResponse,
  WarehouseResponse,
} from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

function sizeLabel(size: string): string {
  return size === "ONE_SIZE" ? "One Size" : size;
}

export function RestockRequestsPage() {
  const [requests, setRequests] = useState<RestockRequestResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUS);

  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supplierApi.list().then(setSuppliers).catch(() => {});
    productApi.list({ size: 100 }).then((r) => setProducts(r.content)).catch(() => {});
    warehouseApi.list().then(setWarehouses).catch(() => {});
  }, []);

  const loadRequests = () => {
    setLoading(true);
    restockRequestApi
      .list({ status: statusFilter === ALL_STATUS ? undefined : (statusFilter as RestockStatus), page, size: PAGE_SIZE })
      .then((result) => {
        setRequests(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load restock requests.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadRequests, [page, statusFilter]);

  const handleProductChange = (value: string) => {
    setProductId(value);
    setVariantId("");
    setVariantsLoading(true);
    productVariantApi
      .list(Number(value))
      .then(setVariants)
      .catch(() => setVariants([]))
      .finally(() => setVariantsLoading(false));
  };

  const resetForm = () => {
    setSupplierId("");
    setProductId("");
    setVariantId("");
    setVariants([]);
    setWarehouseId("");
    setQuantity("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!supplierId || !variantId || !warehouseId || !qty || qty <= 0) {
      toast.error("Please fill in all fields with a valid quantity.");
      return;
    }

    setSubmitting(true);
    try {
      await restockRequestApi.create({
        supplierId: Number(supplierId),
        productVariantId: Number(variantId),
        warehouseId: Number(warehouseId),
        quantity: qty,
      });
      toast.success("Restock request created.");
      setDialogOpen(false);
      resetForm();
      loadRequests();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to create restock request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfill = async (id: number) => {
    try {
      await restockRequestApi.fulfill(id);
      toast.success("Restock request fulfilled - stock has been added.");
      loadRequests();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to fulfill restock request.");
      throw error;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Restock Requests"
        description="Request and receive stock from suppliers."
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(next) => {
              setDialogOpen(next);
              if (!next) resetForm();
            }}
          >
            <DialogTrigger render={<Button />}>
              <Plus className="size-4" />
              Create Restock Request
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Restock Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Supplier</Label>
                  <Select value={supplierId} onValueChange={(v) => v && setSupplierId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Product</Label>
                  <Select value={productId} onValueChange={(v) => v && handleProductChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Size</Label>
                  <Select value={variantId} onValueChange={(v) => v && setVariantId(v)} disabled={!productId || variantsLoading}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={variantsLoading ? "Loading..." : "Select a size"} />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={String(variant.id)}>
                          {sizeLabel(variant.size)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Warehouse</Label>
                  <Select value={warehouseId} onValueChange={(v) => v && setWarehouseId(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="restock-qty">Quantity</Label>
                  <Input id="restock-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Request"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

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
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No restock requests" description="Create one to request stock from a supplier." />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.product.name}</TableCell>
                    <TableCell>{sizeLabel(request.size)}</TableCell>
                    <TableCell>{request.supplier.name}</TableCell>
                    <TableCell>{request.warehouse.name}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={request.status === "PENDING" ? "secondary" : "default"}>{request.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {request.status === "PENDING" ? (
                        <ConfirmDeleteDialog
                          trigger={
                            <Button variant="outline" size="sm">
                              <ClipboardCheck className="size-3.5" />
                              Fulfill
                            </Button>
                          }
                          title="Fulfill this restock request?"
                          description={`This will add ${request.quantity} units of ${request.product.name} (${sizeLabel(request.size)}) to ${request.warehouse.name}'s inventory.`}
                          confirmLabel="Fulfill"
                          variant="default"
                          onConfirm={() => handleFulfill(request.id)}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">Completed</span>
                      )}
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
