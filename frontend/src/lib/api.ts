import type {
  AuthResponse,
  BuyNowRequest,
  CartItemRequest,
  CartResponse,
  CategoryResponse,
  CheckoutResponse,
  CreateReviewRequest,
  LoginRequest,
  OrderSummaryResponse,
  Page,
  ProductResponse,
  ProductSearchParams,
  RegisterRequest,
  ReviewResponse,
  WishlistResponse,
} from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const TOKEN_STORAGE_KEY = "krateon_token";

// The JWT is kept in a module-level variable for fast, synchronous access on
// every request, and mirrored to localStorage so the session survives a page
// refresh. In a production app this would ideally be an httpOnly cookie set
// by the server, so client-side JS could never read the token at all -
// localStorage is an acceptable tradeoff for a portfolio project.
let inMemoryToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

export function getToken(): string | null {
  return inMemoryToken;
}

export function setToken(token: string | null): void {
  inMemoryToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered by AuthProvider so a 401 on an authenticated request can clear state and redirect. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Whether to attach the Authorization header and treat a 401 as "session expired". Defaults to true. */
  auth?: boolean;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && inMemoryToken) headers["Authorization"] = `Bearer ${inMemoryToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Please check your connection and try again.", 0);
  }

  // Only treat a 401 as "session expired" for requests that were actually sent with
  // auth intent - a failed login/register also returns 401 but for the ordinary reason
  // of bad credentials, and should surface the backend's real message instead.
  if (response.status === 401 && auth) {
    setToken(null);
    unauthorizedHandler?.();
    throw new ApiError("Your session has expired. Please log in again.", 401);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status})`;
    const details =
      data && typeof data === "object" && "details" in data && Array.isArray(data.details)
        ? (data.details as string[])
        : undefined;
    throw new ApiError(message, response.status, details);
  }

  return data as T;
}

export const authApi = {
  login: (payload: LoginRequest) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: payload, auth: false }),
  register: (payload: RegisterRequest) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: payload, auth: false }),
};

export const categoryApi = {
  list: () => request<CategoryResponse[]>("/api/categories", { auth: false }),
};

export const productApi = {
  list: (params: ProductSearchParams) => {
    const query = new URLSearchParams();
    if (params.categoryId !== undefined) query.set("categoryId", String(params.categoryId));
    if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
    if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
    if (params.keyword) query.set("keyword", params.keyword);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 12));
    return request<Page<ProductResponse>>(`/api/products?${query.toString()}`, { auth: false });
  },
  getById: (id: number) => request<ProductResponse>(`/api/products/${id}`, { auth: false }),
  bestSellers: (limit = 8) =>
    request<ProductResponse[]>(`/api/products/best-sellers?limit=${limit}`, { auth: false }),
};

export const cartApi = {
  get: () => request<CartResponse>("/api/cart"),
  addItem: (payload: CartItemRequest) =>
    request<CartResponse>("/api/cart/items", { method: "POST", body: payload }),
  updateItemQuantity: (productVariantId: number, quantity: number) =>
    request<CartResponse>(`/api/cart/items/${productVariantId}`, {
      method: "PUT",
      body: { productVariantId, quantity },
    }),
  removeItem: (productVariantId: number) =>
    request<void>(`/api/cart/items/${productVariantId}`, { method: "DELETE" }),
};

export const orderApi = {
  checkout: () => request<CheckoutResponse>("/api/orders/checkout", { method: "POST" }),
  buyNow: (payload: BuyNowRequest) =>
    request<CheckoutResponse>("/api/orders/buy-now", { method: "POST", body: payload }),
  history: (page = 0, size = 10) =>
    request<Page<OrderSummaryResponse>>(`/api/orders?page=${page}&size=${size}`),
  getById: (id: number) => request<CheckoutResponse>(`/api/orders/${id}`),
};

export const reviewApi = {
  list: (productId: number, page = 0, size = 10) =>
    request<Page<ReviewResponse>>(`/api/products/${productId}/reviews?page=${page}&size=${size}`, {
      auth: false,
    }),
  create: (productId: number, payload: CreateReviewRequest) =>
    request<ReviewResponse>(`/api/products/${productId}/reviews`, { method: "POST", body: payload }),
  update: (productId: number, payload: CreateReviewRequest) =>
    request<ReviewResponse>(`/api/products/${productId}/reviews`, { method: "PUT", body: payload }),
  remove: (productId: number) =>
    request<void>(`/api/products/${productId}/reviews`, { method: "DELETE" }),
};

export const wishlistApi = {
  get: () => request<WishlistResponse>("/api/wishlist"),
  addItem: (productId: number) =>
    request<WishlistResponse>("/api/wishlist/items", { method: "POST", body: { productId } }),
  removeItem: (productId: number) =>
    request<void>(`/api/wishlist/items/${productId}`, { method: "DELETE" }),
};
