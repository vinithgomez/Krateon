import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { wishlistApi } from "@/lib/api";
import type { WishlistResponse } from "@/types/api";
import { useAuth } from "./AuthContext";

interface WishlistContextValue {
  wishlist: WishlistResponse | null;
  productIds: Set<number>;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist(null);
      return;
    }
    setLoading(true);
    try {
      const data = await wishlistApi.get();
      setWishlist(data);
    } catch (error) {
      console.error("Failed to load wishlist", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId: number) => {
    const data = await wishlistApi.addItem(productId);
    setWishlist(data);
  }, []);

  const removeItem = useCallback(async (productId: number) => {
    await wishlistApi.removeItem(productId);
    await refresh();
  }, [refresh]);

  const productIds = useMemo(
    () => new Set(wishlist?.items.map((item) => item.product.id) ?? []),
    [wishlist],
  );

  const isWishlisted = useCallback((productId: number) => productIds.has(productId), [productIds]);

  const value = useMemo<WishlistContextValue>(
    () => ({ wishlist, productIds, loading, refresh, addItem, removeItem, isWishlisted }),
    [wishlist, productIds, loading, refresh, addItem, removeItem, isWishlisted],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
