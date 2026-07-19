import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartApi } from "@/lib/api";
import type { CartResponse } from "@/types/api";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  cart: CartResponse | null;
  itemCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateItemQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const data = await cartApi.get();
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId: number, quantity: number) => {
    const data = await cartApi.addItem({ productId, quantity });
    setCart(data);
  }, []);

  const updateItemQuantity = useCallback(async (productId: number, quantity: number) => {
    const data = await cartApi.updateItemQuantity(productId, quantity);
    setCart(data);
  }, []);

  const removeItem = useCallback(async (productId: number) => {
    await cartApi.removeItem(productId);
    await refresh();
  }, [refresh]);

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  const value = useMemo<CartContextValue>(
    () => ({ cart, itemCount, loading, refresh, addItem, updateItemQuantity, removeItem }),
    [cart, itemCount, loading, refresh, addItem, updateItemQuantity, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
