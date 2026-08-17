import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError, categoryApi, productApi, productVariantApi } from "@/lib/api";
import { ALL_SIZES } from "@/types/api";
import type { CategoryResponse, ProductRequest, ProductVariantResponse, Size } from "@/types/api";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function sizeLabel(size: Size): string {
  return size === "ONE_SIZE" ? "One Size" : size;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [form, setForm] = useState<ProductRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [active, setActiveState] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);

  const [variants, setVariants] = useState<ProductVariantResponse[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(true);
  const [newSize, setNewSize] = useState<Size | "">("");
  const [addingVariant, setAddingVariant] = useState(false);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
  }, []);

  const loadProduct = () => {
    setLoading(true);
    setNotFound(false);
    productApi
      .getById(productId)
      .then((product) => {
        setForm({
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          imageUrl: product.imageUrl ?? "",
          categoryId: product.category.id,
        });
        setActiveState(product.active);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          toast.error(error instanceof ApiError ? error.message : "Failed to load product.");
        }
      })
      .finally(() => setLoading(false));
  };

  const loadVariants = () => {
    setVariantsLoading(true);
    productVariantApi
      .list(productId)
      .then(setVariants)
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : "Failed to load variants.");
      })
      .finally(() => setVariantsLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    loadProduct();
    loadVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setSaving(true);
    try {
      await productApi.update(productId, form);
      toast.success("Product updated.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSize) {
      toast.error("Please select a size.");
      return;
    }

    setAddingVariant(true);
    try {
      await productVariantApi.create(productId, { size: newSize });
      toast.success(`Added ${sizeLabel(newSize)} variant.`);
      setNewSize("");
      loadVariants();
    } catch (error) {
      // The backend returns a clear 409 message when this (product, size) pair already exists.
      toast.error(error instanceof ApiError ? error.message : "Failed to add variant.");
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    try {
      await productVariantApi.remove(productId, variantId);
      toast.success("Variant deleted.");
      loadVariants();
    } catch (error) {
      // The backend returns a clear 409 when the variant still has inventory/cart/order/
      // restock references, instead of a misleading 500 or 503.
      toast.error(error instanceof ApiError ? error.message : "Failed to delete variant.");
      throw error;
    }
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    try {
      const updated = await productApi.setActive(productId, !active);
      setActiveState(updated.active);
      toast.success(updated.active ? "Product is now visible on the storefront." : "Product hidden from the storefront.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update product visibility.");
    } finally {
      setTogglingActive(false);
    }
  };

  const availableSizes = ALL_SIZES.filter((size) => !variants.some((v) => v.size === size));

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <p className="text-lg font-medium">Product not found</p>
        <Button variant="outline" className="mt-2" onClick={() => navigate("/products")}>
          Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/products" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to products
      </Link>

      <PageHeader
        title={form.name}
        description={`Product #${productId}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={active ? "secondary" : "outline"}>{active ? "Active" : "Hidden"}</Badge>
            <Button variant="outline" size="sm" disabled={togglingActive} onClick={handleToggleActive}>
              {active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {togglingActive ? "Updating..." : active ? "Hide from storefront" : "Show on storefront"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  rows={4}
                  value={form.description ?? ""}
                  onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  value={form.price}
                  onChange={(e) => setForm((f) => f && { ...f, price: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-image">Image URL</Label>
                <Input
                  id="edit-image"
                  value={form.imageUrl ?? ""}
                  onChange={(e) => setForm((f) => f && { ...f, imageUrl: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select
                  value={String(form.categoryId)}
                  onValueChange={(value) => value && setForm((f) => f && { ...f, categoryId: Number(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="h-32 w-32 rounded-lg border object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
              <Button type="submit" disabled={saving} className="w-fit">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Size Variants</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {variantsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No variants yet. Add one below.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <Badge key={variant.id} variant="secondary" className="gap-1 text-sm">
                    {sizeLabel(variant.size)}
                    <ConfirmDeleteDialog
                      trigger={
                        <button
                          type="button"
                          className="-mr-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                          aria-label={`Delete ${sizeLabel(variant.size)} variant`}
                        >
                          <X className="size-3" />
                        </button>
                      }
                      title={`Delete ${sizeLabel(variant.size)} variant?`}
                      description="This cannot be undone, and will fail if the variant has existing inventory, cart items, orders, or restock requests."
                      onConfirm={() => handleDeleteVariant(variant.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {availableSizes.length > 0 ? (
              <form onSubmit={handleAddVariant} className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Add a size</Label>
                  <Select value={newSize} onValueChange={(value) => setNewSize((value as Size) ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a size" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {sizeLabel(size)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={addingVariant}>
                  <Plus className="size-4" />
                  {addingVariant ? "Adding..." : "Add"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">All sizes have been added for this product.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
