import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ImageOff, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRating } from "@/components/StarRating";
import { SizeSelector, isSingleOneSize } from "@/components/SizeSelector";
import { formatCurrency } from "@/lib/format";
import { ApiError, productApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { ProductResponse, ProductVariantResponse } from "@/types/api";

interface ProductCardProps {
  product: ProductResponse;
  /** Shows a "#N Best Seller" badge - used only by the home page's Best Sellers section. */
  rank?: number;
}

export function ProductCard({ product, rank }: ProductCardProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isWishlisted, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlist();

  const [addingToCart, setAddingToCart] = useState(false);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [sizeDialogVariants, setSizeDialogVariants] = useState<ProductVariantResponse[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const wishlisted = isWishlisted(product.id);

  const addVariantToCart = async (variantId: number) => {
    setAddingToCart(true);
    try {
      await addItem(variantId, 1);
      toast.success(`Added ${product.name} to your cart.`);
      setSizeDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add item to cart.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info("Please log in to add items to your cart.");
      navigate("/login");
      return;
    }

    setAddingToCart(true);
    try {
      // The list/wishlist views don't carry variant data, so fetch the authoritative
      // detail before deciding whether a size needs to be picked.
      const detail = await productApi.getById(product.id);
      if (isSingleOneSize(detail.variants)) {
        await addVariantToCart(detail.variants[0].id);
        return;
      }
      setSizeDialogVariants(detail.variants);
      setSelectedVariantId(null);
      setSizeDialogOpen(true);
      setAddingToCart(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to add item to cart.");
      setAddingToCart(false);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info("Please log in to use your wishlist.");
      navigate("/login");
      return;
    }

    setWishlistPending(true);
    try {
      if (wishlisted) {
        await removeFromWishlist(product.id);
        toast.success(`Removed ${product.name} from your wishlist.`);
      } else {
        await addToWishlist(product.id);
        toast.success(`Added ${product.name} to your wishlist.`);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update your wishlist.");
    } finally {
      setWishlistPending(false);
    }
  };

  return (
    <div className="group relative">
      <Link to={`/products/${product.id}`} className="block">
        <Card className="h-full gap-0 overflow-hidden py-0 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageOff className="size-10 text-muted-foreground" />
              </div>
            )}
            {rank !== undefined && (
              <Badge className="absolute top-2 left-2 gap-1 bg-amber-500 text-white">
                <Trophy className="size-3" />#{rank} Best Seller
              </Badge>
            )}
          </div>
          <CardContent className="flex flex-1 flex-col gap-1.5 py-3">
            <Badge variant="secondary" className="w-fit text-[0.7rem] font-normal">
              {product.category.name}
            </Badge>
            <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">{product.name}</p>
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-1.5">
                <StarRating rating={product.averageRating} size="sm" />
                <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
              </div>
            )}
            <span className="text-lg font-semibold">{formatCurrency(product.price)}</span>
          </CardContent>
        </Card>
      </Link>

      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 has-[[data-wishlisted=true]]:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="rounded-full shadow-md"
          data-wishlisted={wishlisted}
          disabled={wishlistPending}
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart className={cn("size-4", wishlisted && "fill-destructive text-destructive")} />
        </Button>

        <Button
          type="button"
          size="icon"
          className="rounded-full shadow-md"
          onClick={handleQuickAdd}
          disabled={addingToCart}
          aria-label={`Add ${product.name} to cart`}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <Dialog open={sizeDialogOpen} onOpenChange={setSizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a size</DialogTitle>
          </DialogHeader>
          {sizeDialogVariants.length === 0 ? (
            <p className="text-sm text-muted-foreground">This product doesn't have any available sizes right now.</p>
          ) : (
            <SizeSelector
              variants={sizeDialogVariants}
              selectedId={selectedVariantId}
              onSelect={setSelectedVariantId}
              disabled={addingToCart}
            />
          )}
          <DialogFooter>
            <Button
              disabled={!selectedVariantId || addingToCart}
              onClick={() => selectedVariantId && addVariantToCart(selectedVariantId)}
            >
              {addingToCart ? "Adding..." : "Add to Cart"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
