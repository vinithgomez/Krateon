# Krateon — E-commerce + Inventory Management System

Krateon is a full-stack, single-seller e-commerce platform with proper inventory management —
multi-warehouse stock tracking, suppliers, restock requests, and a full stock-movement audit
trail. It is **not** a multi-vendor marketplace: one store, one admin team, multiple warehouses.

## Tech Stack

- **Backend**: Spring Boot 3.x, Java 17, Maven
- **Database**: PostgreSQL (Spring Data JPA / Hibernate)
- **Caching**: Redis (product/category read caching with TTL + explicit eviction)
- **Auth**: Spring Security + JWT (stateless, role-based: `ADMIN` / `CUSTOMER`)
- **Frontend** (planned): React + Tailwind CSS
- **API Docs** (planned): Swagger / OpenAPI

## Current Status

Backend phases 1–7 are complete:

1. Project setup, JPA entities, repositories, PostgreSQL schema
2. Auth — JWT, Spring Security, role-based access control
3. Product + Category CRUD (admin) and public browse/search (customer)
4. Inventory + Warehouse + StockMovement, with transactional, pessimistic-locked stock
   adjustments and a full audit trail
5. Supplier + RestockRequest fulfillment flow
6. Cart + Order + checkout, with concurrency-safe stock deduction at checkout
7. Redis caching layer for product/category reads, with TTL and explicit write-through
   eviction

Remaining: React frontend (customer storefront + admin dashboard), Swagger docs, and
deployment configuration.

## Package Structure

```
controller/   → REST endpoints only, no business logic
service/      → business logic, transactional operations
repository/   → Spring Data JPA interfaces
entity/       → JPA entities
dto/          → request/response objects — entities are never exposed directly in API responses
security/     → JWT filter, Spring Security config, current-user resolution
exception/    → global exception handling (@ControllerAdvice)
config/       → Redis config, CORS config
```

## Core Domain

`User`, `Category`, `Product`, `Warehouse`, `Inventory`, `StockMovement`, `Supplier`,
`RestockRequest`, `Cart`, `CartItem`, `Order`, `OrderItem`.

Product and Inventory are deliberately separate concerns: a product's stock is tracked
per-warehouse via `Inventory` rows, not as a single quantity field on `Product`. Every
change to `Inventory.quantity` — stock-in, stock-out, restock fulfillment, or a sale at
checkout — produces a corresponding `StockMovement` audit record in the same transaction.

## Prerequisites

- Java 17
- Maven
- PostgreSQL (running locally or in a container)
- Redis (running locally or in a container, e.g. `docker run -d -p 6379:6379 --name krateon-redis redis`)

## Setup

1. **Create the database**
   ```sql
   CREATE DATABASE krateon_db;
   ```

2. **Configure local secrets**

   Copy the example properties file and fill in your own values — the real file is
   gitignored so credentials never get committed:
   ```bash
   cp src/main/resources/application.properties.example src/main/resources/application.properties
   ```
   Then edit `src/main/resources/application.properties`:
   - `spring.datasource.username` / `spring.datasource.password` — your local PostgreSQL credentials
   - `jwt.secret` — generate your own long random secret, e.g. `openssl rand -hex 64`

3. **Run the application**
   ```bash
   mvn spring-boot:run
   ```
   On first run, Hibernate creates all tables automatically (`spring.jpa.hibernate.ddl-auto=update`).

4. **Verify**
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Jane Doe","email":"jane@example.com","password":"password123"}'
   ```
   A successful response returns a JWT.

### Build check only

```bash
mvn compile
```

## API Overview

All admin-only routes are under `/api/admin/**` and require a JWT with `role=ADMIN`.
Everything else that isn't explicitly public requires any authenticated user.

| Area | Endpoint | Access |
|---|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` | Public |
| Categories | `GET /api/categories`, `GET /api/categories/{id}` | Public |
| Categories | `POST/PUT/DELETE /api/admin/categories[/{id}]` | Admin |
| Products | `GET /api/products` (filter: `categoryId`, `minPrice`, `maxPrice`, `keyword`, paginated), `GET /api/products/{id}` | Public |
| Products | `POST/PUT/DELETE /api/admin/products[/{id}]` | Admin |
| Warehouses | Full CRUD under `/api/admin/warehouses` | Admin |
| Inventory | `POST /api/admin/inventory` (initial stock), `POST /api/admin/inventory/adjust` (STOCK_IN/STOCK_OUT/RETURN), `GET /api/admin/inventory/product/{productId}`, `GET /api/admin/inventory/low-stock`, `GET /api/admin/inventory/{id}/movements` | Admin |
| Suppliers | Full CRUD under `/api/admin/suppliers` | Admin |
| Restock Requests | `POST /api/admin/restock-requests`, `POST /api/admin/restock-requests/{id}/fulfill`, `GET /api/admin/restock-requests` (filter: `status`, `supplierId`), `GET /api/admin/restock-requests/{id}` | Admin |
| Cart | `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/{productId}`, `DELETE /api/cart/items/{productId}` | Authenticated |
| Orders | `POST /api/orders/checkout`, `GET /api/orders` (own history), `GET /api/orders/{id}` (own orders only) | Authenticated |
| Orders (admin) | `GET /api/admin/orders` (filter: `status`), `PUT /api/admin/orders/{id}/status` | Admin |

## Design Notes

- **Concurrency-safe checkout**: stock adjustments use `SELECT ... FOR UPDATE`
  (`@Lock(PESSIMISTIC_WRITE)`) inside a single `@Transactional` boundary, so concurrent
  checkouts against the same inventory row can never oversell. If any line item in a
  cart lacks sufficient stock, the entire order rolls back — no partial deduction.
- **DTOs only at the API boundary** — controllers never accept or return JPA entities.
- **Order history is immutable** — `OrderItem.priceAtPurchase` is captured at checkout
  time, not looked up live from `Product`, so past orders reflect what was actually charged.
- **Cache correctness** — Redis caches single-entity product/category lookups only
  (never paginated search results, to avoid cache-key explosion and stale pagination).
  Writes evict their own cache entries explicitly; inventory/stock changes do **not**
  evict product cache entries, since `ProductResponse` carries no stock data.
