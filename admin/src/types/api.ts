export type Role = "ADMIN" | "CUSTOMER";

export interface AuthResponse {
  token: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[] | null;
}

// ---- Categories ----

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
}

export interface CategoryRequest {
  name: string;
  description?: string | null;
}

// ---- Products ----

export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "ONE_SIZE";

export const ALL_SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL", "ONE_SIZE"];

export interface ProductVariantResponse {
  id: number;
  size: Size;
}

export interface ProductVariantRequest {
  size: Size;
}

export interface ProductResponse {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: CategoryResponse;
  variants: ProductVariantResponse[];
  averageRating: number;
  reviewCount: number;
  active: boolean;
}

export interface ProductRequest {
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryId: number;
}

export interface ProductSearchParams {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface ProductSummary {
  id: number;
  name: string;
  price: number;
}

// ---- Warehouses ----

export interface WarehouseResponse {
  id: number;
  name: string;
  location: string;
}

export interface WarehouseRequest {
  name: string;
  location: string;
}

// ---- Inventory ----

export interface InventoryResponse {
  id: number;
  productVariantId: number;
  size: Size;
  product: ProductSummary;
  warehouse: WarehouseResponse;
  quantity: number;
  lowStockThreshold: number;
  lowStock: boolean;
}

export interface InventoryRequest {
  productVariantId: number;
  warehouseId: number;
  quantity: number;
  lowStockThreshold: number;
}

export type StockMovementType = "STOCK_IN" | "STOCK_OUT" | "SALE" | "RETURN";

export interface StockAdjustmentRequest {
  inventoryId: number;
  changeQty: number;
  type: StockMovementType;
  reason?: string | null;
}

export interface StockMovementResponse {
  id: number;
  inventoryId: number;
  changeQty: number;
  type: StockMovementType;
  reason: string | null;
  createdAt: string;
}

// ---- Suppliers ----

export interface SupplierResponse {
  id: number;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
}

export interface SupplierRequest {
  name: string;
  contactEmail: string;
  contactPhone?: string | null;
}

// ---- Restock Requests ----

export type RestockStatus = "PENDING" | "RECEIVED";

export interface RestockRequestResponse {
  id: number;
  supplier: SupplierResponse;
  productVariantId: number;
  size: Size;
  product: ProductSummary;
  warehouse: WarehouseResponse;
  quantity: number;
  status: RestockStatus;
  createdAt: string;
}

export interface RestockRequestCreateRequest {
  supplierId: number;
  productVariantId: number;
  warehouseId: number;
  quantity: number;
}

// ---- Orders ----

export type OrderStatus = "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export const ORDER_STATUSES: OrderStatus[] = ["PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export interface OrderItemResponse {
  productId: number;
  productVariantId: number;
  size: Size;
  productName: string;
  quantity: number;
  priceAtPurchase: number;
  subtotal: number;
}

export interface CheckoutResponse {
  orderId: number;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemResponse[];
  createdAt: string;
}

export interface OrderSummaryResponse {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
}

// ---- Reviews ----

export interface ReviewResponse {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}
