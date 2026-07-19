export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
}

export interface ProductResponse {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: CategoryResponse;
}

export interface ProductSummary {
  id: number;
  name: string;
  price: number;
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

export interface ProductSearchParams {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
  page?: number;
  size?: number;
}

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

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CartItemRequest {
  productId: number;
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  product: ProductSummary;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  id: number;
  items: CartItemResponse[];
  totalAmount: number;
}

export type OrderStatus = "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface OrderItemResponse {
  productId: number;
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

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[] | null;
}
