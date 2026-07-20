import type {
  AuthResponse,
  CategoryRequest,
  CategoryResponse,
  InventoryRequest,
  InventoryResponse,
  LoginRequest,
  OrderStatus,
  OrderStatusUpdateRequest,
  OrderSummaryResponse,
  Page,
  CheckoutResponse,
  ProductRequest,
  ProductResponse,
  ProductSearchParams,
  ProductVariantRequest,
  ProductVariantResponse,
  RestockRequestCreateRequest,
  RestockRequestResponse,
  RestockStatus,
  ReviewResponse,
  StockAdjustmentRequest,
  StockMovementResponse,
  SupplierRequest,
  SupplierResponse,
  WarehouseRequest,
  WarehouseResponse,
} from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const TOKEN_STORAGE_KEY = "krateon_admin_token";

// Mirrors the storefront's token-handling pattern: kept in a module-level variable for
// fast synchronous access, mirrored to localStorage so the session survives a refresh.
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

  if (response.status === 401 && auth) {
    setToken(null);
    unauthorizedHandler?.();
    throw new ApiError("Your session has expired. Please log in again.", 401);
  }

  if (response.status === 403 && auth) {
    throw new ApiError("You don't have permission to perform this action.", 403);
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
};

export const categoryApi = {
  list: () => request<CategoryResponse[]>("/api/categories", { auth: false }),
  create: (payload: CategoryRequest) =>
    request<CategoryResponse>("/api/admin/categories", { method: "POST", body: payload }),
  update: (id: number, payload: CategoryRequest) =>
    request<CategoryResponse>(`/api/admin/categories/${id}`, { method: "PUT", body: payload }),
  remove: (id: number) => request<void>(`/api/admin/categories/${id}`, { method: "DELETE" }),
};

export const productApi = {
  list: (params: ProductSearchParams) => {
    const query = new URLSearchParams();
    if (params.categoryId !== undefined) query.set("categoryId", String(params.categoryId));
    if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
    if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
    if (params.keyword) query.set("keyword", params.keyword);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    return request<Page<ProductResponse>>(`/api/products?${query.toString()}`, { auth: false });
  },
  getById: (id: number) => request<ProductResponse>(`/api/products/${id}`, { auth: false }),
  create: (payload: ProductRequest) =>
    request<ProductResponse>("/api/admin/products", { method: "POST", body: payload }),
  update: (id: number, payload: ProductRequest) =>
    request<ProductResponse>(`/api/admin/products/${id}`, { method: "PUT", body: payload }),
  remove: (id: number) => request<void>(`/api/admin/products/${id}`, { method: "DELETE" }),
};

export const productVariantApi = {
  list: (productId: number) =>
    request<ProductVariantResponse[]>(`/api/admin/products/${productId}/variants`),
  create: (productId: number, payload: ProductVariantRequest) =>
    request<ProductVariantResponse>(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      body: payload,
    }),
};

export const warehouseApi = {
  list: () => request<WarehouseResponse[]>("/api/admin/warehouses"),
  getById: (id: number) => request<WarehouseResponse>(`/api/admin/warehouses/${id}`),
  create: (payload: WarehouseRequest) =>
    request<WarehouseResponse>("/api/admin/warehouses", { method: "POST", body: payload }),
  update: (id: number, payload: WarehouseRequest) =>
    request<WarehouseResponse>(`/api/admin/warehouses/${id}`, { method: "PUT", body: payload }),
  remove: (id: number) => request<void>(`/api/admin/warehouses/${id}`, { method: "DELETE" }),
};

export const inventoryApi = {
  create: (payload: InventoryRequest) =>
    request<InventoryResponse>("/api/admin/inventory", { method: "POST", body: payload }),
  adjust: (payload: StockAdjustmentRequest) =>
    request<InventoryResponse>("/api/admin/inventory/adjust", { method: "POST", body: payload }),
  byProduct: (productId: number) =>
    request<InventoryResponse[]>(`/api/admin/inventory/product/${productId}`),
  lowStock: () => request<InventoryResponse[]>("/api/admin/inventory/low-stock"),
  movements: (inventoryId: number, page = 0, size = 10) =>
    request<Page<StockMovementResponse>>(
      `/api/admin/inventory/${inventoryId}/movements?page=${page}&size=${size}`,
    ),
};

export const supplierApi = {
  list: () => request<SupplierResponse[]>("/api/admin/suppliers"),
  create: (payload: SupplierRequest) =>
    request<SupplierResponse>("/api/admin/suppliers", { method: "POST", body: payload }),
  update: (id: number, payload: SupplierRequest) =>
    request<SupplierResponse>(`/api/admin/suppliers/${id}`, { method: "PUT", body: payload }),
  remove: (id: number) => request<void>(`/api/admin/suppliers/${id}`, { method: "DELETE" }),
};

export const restockRequestApi = {
  list: (params: { status?: RestockStatus; supplierId?: number; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.supplierId !== undefined) query.set("supplierId", String(params.supplierId));
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    return request<Page<RestockRequestResponse>>(`/api/admin/restock-requests?${query.toString()}`);
  },
  create: (payload: RestockRequestCreateRequest) =>
    request<RestockRequestResponse>("/api/admin/restock-requests", { method: "POST", body: payload }),
  fulfill: (id: number) =>
    request<RestockRequestResponse>(`/api/admin/restock-requests/${id}/fulfill`, { method: "POST" }),
};

// NOTE: there is no admin endpoint to fetch a single order's line-item detail for an
// arbitrary customer. GET /api/orders/{id} exists, but it's ownership-scoped to the
// calling user (an admin hitting it only ever sees their own orders, not a customer's) -
// see OrderService.getOrderById's explicit ownership check. GET /api/admin/orders only
// returns OrderSummaryResponse (no items). PUT /api/admin/orders/{id}/status happens to
// return full item detail, but only as a side effect of actually changing the order's
// status, so it can't be used as a safe read. Flagged to the team; not worked around here.
export const orderApi = {
  list: (params: { status?: OrderStatus; page?: number; size?: number }) => {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    query.set("page", String(params.page ?? 0));
    query.set("size", String(params.size ?? 10));
    return request<Page<OrderSummaryResponse>>(`/api/admin/orders?${query.toString()}`);
  },
  updateStatus: (id: number, payload: OrderStatusUpdateRequest) =>
    request<CheckoutResponse>(`/api/admin/orders/${id}/status`, { method: "PUT", body: payload }),
};

export const reviewApi = {
  listForProduct: (productId: number, page = 0, size = 10) =>
    request<Page<ReviewResponse>>(`/api/products/${productId}/reviews?page=${page}&size=${size}`, {
      auth: false,
    }),
  remove: (id: number) => request<void>(`/api/admin/reviews/${id}`, { method: "DELETE" }),
};
