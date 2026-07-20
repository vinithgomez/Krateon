# Krateon — E-commerce + Inventory Management System

## Project Overview
Krateon is a full-stack, single-seller e-commerce platform with proper inventory management
(multi-warehouse stock tracking, suppliers, restock requests, stock movement audit logging).
This is NOT a multi-vendor marketplace — one store, one admin team, multiple warehouses.

## Tech Stack
- **Backend**: Spring Boot 3.x, Java 17, Maven
- **Database**: PostgreSQL (Spring Data JPA / Hibernate)
- **Caching**: Redis (product/category read caching)
- **Auth**: Spring Security + JWT
- **Frontend**: React + Tailwind CSS
- **API Docs**: Swagger / OpenAPI
- **Deployment target**: Backend on Render/Railway, Frontend on Vercel

## Base Package
`com.krateon.backend`

## Package Structure
```
controller/   → REST endpoints only, no business logic
service/      → business logic, transactional operations
repository/   → Spring Data JPA interfaces
entity/       → JPA entities
dto/          → request/response objects — NEVER expose entities directly in API responses
security/     → JWT filter, Spring Security config
exception/    → global exception handling (@ControllerAdvice)
config/       → Redis config, Swagger config, CORS config
```

## Core Domain Entities
User, Category, Product, Warehouse, Inventory, StockMovement, Supplier,
RestockRequest, Cart, CartItem, Order, OrderItem

Key relationship: Product ↔ Inventory is one-to-many across Warehouses — this is what makes
the project "inventory management," not just a shopping cart demo. Don't collapse this into
a single stock-quantity field on Product.

## Critical Business Rules (do not violate in any phase)
1. **Stock deduction must be transactional and concurrency-safe.** When an order is placed,
   check stock availability and decrement it atomically (`@Transactional`, with optimistic or
   pessimistic locking on the Inventory row) to prevent overselling under concurrent orders.
2. **Every stock change must produce a StockMovement record.** Never silently update
   `Inventory.quantity` without an accompanying audit log entry (type: STOCK_IN, STOCK_OUT,
   SALE, or RETURN).
3. **DTOs only at the API boundary.** Controllers must never accept or return JPA entities
   directly — always map to/from DTOs.
4. **Role-based access**: ADMIN endpoints (product/inventory/supplier/order management) must
   be protected separately from CUSTOMER endpoints (browse/cart/checkout/order history).

## Known Regressions to Watch For

### Redis category-cache 500 (Jackson bare-array deserialization)
This has recurred twice — introduced and fixed in Phase 7, then reappeared during Phase 12
testing because the fix had silently been lost/reverted. If `GET /api/categories` (or any
other `@Cacheable` method whose return type is itself a bare `List`/array, not a wrapping
single object) starts throwing 500s, **check this before re-diagnosing from scratch**:

- **What breaks**: `MismatchedInputException` from Jackson's `AsArrayTypeDeserializer`,
  surfacing as a 500 on the affected endpoint.
- **Why**: Jackson's default `DefaultTyping.NON_FINAL` policy (the behavior of the plain
  no-arg `new GenericJackson2JsonRedisSerializer()` constructor) skips embedding a type id
  for any `final` runtime class. `Stream.toList()` (used in `CategoryService.getAll()` and
  similarly-shaped methods) returns `java.util.ImmutableCollections$ListN`, a JDK-internal
  final class. That makes the cache **write** silently produce an untyped bare JSON array.
  The cache **read** deserializes against a generic `Object` target (the cache manager erases
  the concrete return type), which requires an embedded type id — and since one was never
  written, it fails.
- **The fix that must be preserved**: `RedisConfig.java` must build its
  `GenericJackson2JsonRedisSerializer` from a custom `ObjectMapper` configured with
  `DefaultTyping.EVERYTHING` + `JsonTypeInfo.As.WRAPPER_ARRAY`. This removes the final-class
  exemption so immutable lists round-trip correctly. **Do not replace this with the plain
  no-arg `GenericJackson2JsonRedisSerializer()` constructor** — that swap is what caused the
  regression both times. See the inline comment on `RedisConfig.cacheManager()` for the
  full mechanism.
- **Also required**: `sync = true` on `@Cacheable` methods that return collections (e.g.
  `CategoryService.getAll()`), to prevent a cache-stampede on a cold miss.
- **Do not misdiagnose this as a race condition.** It is 100% deterministic per cache key —
  confirmed via log correlation (single-threaded MISS writes the bad value; any later request
  against that same key fails identically until the key is evicted). It can *look*
  intermittent from the outside because some requests succeed (any MISS) and others fail (any
  HIT against an already-poisoned key), but it is not concurrency-related.

## Caching Strategy (introduced in Phase 7 — do not implement early)
- Cache: `GET /products`, `GET /categories` (read-heavy, low-write)
- Evict cache on product create/update/delete or any stock movement affecting a cached product
- TTL fallback (~10 min) as a safety net in case explicit eviction is missed

## Build Order / Phases
1. Project setup + entities + repositories + DB schema
2. Auth (JWT, Spring Security, roles)
3. Product + Category CRUD (admin) + public browse/search (customer)
4. Inventory + Warehouse + StockMovement (transactional stock logic)
5. Supplier + RestockRequest flow
6. Cart + Order + checkout (concurrency-safe stock deduction)
7. Redis caching layer + cache eviction
8. React frontend: customer storefront, then admin dashboard
9. Swagger docs + deployment config

**Only work on the current phase unless explicitly told otherwise.** Do not jump ahead to
implement business logic, security, or caching before their designated phase.

## Conventions
- Lombok (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`) for entities/DTOs
- `@Enumerated(EnumType.STRING)` for all enums (never ORDINAL)
- Consistent REST naming: plural nouns, e.g. `/api/products`, `/api/orders`
- Meaningful commit-style summaries after each phase: list files created/changed and confirm
  the project compiles (`mvn compile`) before considering the phase done
