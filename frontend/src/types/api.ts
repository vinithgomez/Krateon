export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
}

export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "ONE_SIZE";

export interface ProductVariantResponse {
  id: number;
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
  productVariantId: number;
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  productVariantId: number;
  size: Size;
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

export interface BuyNowRequest {
  productVariantId: number;
  quantity: number;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string | null;
}

export interface ReviewResponse {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface WishlistItemResponse {
  id: number;
  product: ProductSummary;
}

export interface WishlistResponse {
  id: number;
  items: WishlistItemResponse[];
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details: string[] | null;
}
