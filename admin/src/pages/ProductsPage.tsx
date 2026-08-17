import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Package, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, categoryApi, productApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryResponse, ProductRequest, ProductResponse } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DeleteProductDialog } from "@/components/products/DeleteProductDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const EMPTY_FORM: ProductRequest = { name: "", description: "", price: 0, imageUrl: "", categoryId: 0 };

export function ProductsPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductRequest>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
  }, []);

  const loadProducts = () => {
    setLoading(true);
    productApi
      .list({ page, size: PAGE_SIZE, keyword: keyword || undefined })
      .then((result) => {
        setProducts(result.content);
        setTotalPages(result.totalPages);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load products.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadProducts, [page, keyword]);

  const handleToggleActive = async (product: ProductResponse) => {
    try {
      await productApi.setActive(product.id, !product.active);
      toast.success(product.active ? `"${product.name}" hidden from the storefront.` : `"${product.name}" is now visible on the storefront.`);
      loadProducts();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update product visibility.");
    }
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  };

  const clearSearch = () => {
    setKeywordInput("");
    setKeyword("");
    setPage(0);
  };

  const openCreateDialog = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? 0 });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error("Please select a category.");
      return;
    }
    setSubmitting(true);
    try {
      await productApi.create(form);
      toast.success("Product created.");
      setDialogOpen(false);
      loadProducts();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to create product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Manage the storefront catalog."
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button onClick={openCreateDialog} />}>
              <Plus className="size-4" />
              Create Product
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-name">Name</Label>
                  <Input
                    id="prod-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-desc">Description</Label>
                  <Textarea
                    id="prod-desc"
                    value={form.description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-price">Price</Label>
                  <Input
                    id="prod-price"
                    type="number"
                    min={0.01}
                    step={0.01}
                    required
                    value={form.price || ""}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="prod-image">Image URL</Label>
                  <Input
                    id="prod-image"
                    value={form.imageUrl ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.categoryId ? String(form.categoryId) : undefined}
                    onValueChange={(value) => value && setForm((f) => ({ ...f, categoryId: Number(value) }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <form onSubmit={applySearch} className="flex items-end gap-2">
        <div className="flex flex-1 max-w-sm flex-col gap-1.5">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name..."
              className="pl-8"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit">Search</Button>
        {keyword && (
          <Button type="button" variant="ghost" onClick={clearSearch}>
            <X className="size-4" />
            Clear
          </Button>
        )}
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products found" description="Try adjusting your search, or create a new product." />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{product.category.name}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      {product.reviewCount > 0 ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          {product.averageRating.toFixed(1)} ({product.reviewCount})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No reviews</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "secondary" : "outline"}>
                        {product.active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={product.active ? "Hide from storefront" : "Show on storefront"}
                          onClick={() => handleToggleActive(product)}
                        >
                          {product.active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                        </Button>
                        <DeleteProductDialog
                          product={product}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label="Delete">
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          }
                          onDeleted={loadProducts}
                        />
                      </div>
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
