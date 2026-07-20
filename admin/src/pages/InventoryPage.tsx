import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, History, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ApiError, inventoryApi, productApi, productVariantApi, warehouseApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { InventoryRequest, InventoryResponse, ProductResponse, ProductVariantResponse, WarehouseResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StockAdjustDialog } from "@/components/inventory/StockAdjustDialog";
import { MovementHistoryDialog } from "@/components/inventory/MovementHistoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function sizeLabel(size: string): string {
  return size === "ONE_SIZE" ? "One Size" : size;
}

function InventoryTable({ rows, onChanged }: { rows: InventoryResponse[]; onChanged: () => void }) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.product.name}</TableCell>
              <TableCell>{sizeLabel(row.size)}</TableCell>
              <TableCell>{row.warehouse.name}</TableCell>
              <TableCell>{row.quantity}</TableCell>
              <TableCell className="text-muted-foreground">{row.lowStockThreshold}</TableCell>
              <TableCell>
                {row.lowStock ? <Badge variant="destructive">Low Stock</Badge> : <Badge variant="secondary">OK</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <StockAdjustDialog
                    inventory={row}
                    onAdjusted={onChanged}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Adjust stock">
                        <SlidersHorizontal className="size-3.5" />
                      </Button>
                    }
                  />
                  <MovementHistoryDialog
                    inventory={row}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="View history">
                        <History className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function BrowseTab({ products }: { products: ProductResponse[] }) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [rows, setRows] = useState<InventoryResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const loadInventory = (productId: number) => {
    setLoading(true);
    inventoryApi
      .byProduct(productId)
      .then(setRows)
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load inventory.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label>Product</Label>
        <Select
          value={selectedProductId}
          onValueChange={(value) => {
            if (!value) return;
            setSelectedProductId(value);
            loadInventory(Number(value));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a product to view its inventory" />
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

      {!selectedProductId ? (
        <p className="text-sm text-muted-foreground">Select a product above to see its stock across warehouses.</p>
      ) : loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title="No inventory rows for this product" description="Use the Create Inventory tab to add stock for it." />
      ) : (
        <InventoryTable rows={rows} onChanged={() => loadInventory(Number(selectedProductId))} />
      )}
    </div>
  );
}

function LowStockTab() {
  const [rows, setRows] = useState<InventoryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    inventoryApi
      .lowStock()
      .then(setRows)
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load low-stock items.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />;

  if (rows.length === 0) {
    return <EmptyState icon={AlertTriangle} title="Nothing is low on stock" description="All inventory is above its low-stock threshold." />;
  }

  return <InventoryTable rows={rows} onChanged={load} />;
}

function CreateInventoryTab({
  products,
  warehouses,
  onCreated,
}: {
  products: ProductResponse[];
  warehouses: WarehouseResponse[];
  onCreated: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [form, setForm] = useState<Partial<InventoryRequest>>({ quantity: 0, lowStockThreshold: 5 });
  const [submitting, setSubmitting] = useState(false);

  const handleProductChange = (value: string) => {
    setProductId(value);
    setForm((f) => ({ ...f, productVariantId: undefined }));
    setVariantsLoading(true);
    productVariantApi
      .list(Number(value))
      .then(setVariants)
      .catch(() => setVariants([]))
      .finally(() => setVariantsLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productVariantId || !form.warehouseId) {
      toast.error("Please select a product variant and a warehouse.");
      return;
    }

    setSubmitting(true);
    try {
      await inventoryApi.create({
        productVariantId: form.productVariantId,
        warehouseId: form.warehouseId,
        quantity: form.quantity ?? 0,
        lowStockThreshold: form.lowStockThreshold ?? 0,
      });
      toast.success("Inventory created.");
      setProductId("");
      setVariants([]);
      setForm({ quantity: 0, lowStockThreshold: 5 });
      onCreated();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to create inventory.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Product</Label>
            <Select value={productId} onValueChange={(value) => value && handleProductChange(value)}>
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
            <Select
              value={form.productVariantId ? String(form.productVariantId) : ""}
              onValueChange={(value) => value && setForm((f) => ({ ...f, productVariantId: Number(value) }))}
              disabled={!productId || variantsLoading}
            >
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
            <Select
              value={form.warehouseId ? String(form.warehouseId) : ""}
              onValueChange={(value) => value && setForm((f) => ({ ...f, warehouseId: Number(value) }))}
            >
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
            <Label htmlFor="init-qty">Initial Quantity</Label>
            <Input
              id="init-qty"
              type="number"
              min={0}
              value={form.quantity ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="init-threshold">Low Stock Threshold</Label>
            <Input
              id="init-threshold"
              type="number"
              min={0}
              value={form.lowStockThreshold ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-fit">
            {submitting ? "Creating..." : "Create Inventory"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function InventoryPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [tab, setTab] = useState("browse");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    productApi.list({ size: 100 }).then((result) => setProducts(result.content)).catch(() => {});
    warehouseApi.list().then(setWarehouses).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory" description="Stock levels across products, sizes, and warehouses." />

      <Tabs value={tab} onValueChange={(value) => value && setTab(value)}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="create">Create Inventory</TabsTrigger>
        </TabsList>
        <TabsContent value="browse" className={cn(tab !== "browse" && "hidden")}>
          <BrowseTab products={products} />
        </TabsContent>
        <TabsContent value="low-stock" className={cn(tab !== "low-stock" && "hidden")}>
          <LowStockTab key={refreshKey} />
        </TabsContent>
        <TabsContent value="create" className={cn(tab !== "create" && "hidden")}>
          <CreateInventoryTab
            products={products}
            warehouses={warehouses}
            onCreated={() => setRefreshKey((k) => k + 1)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
