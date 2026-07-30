# Krateon

A full-stack fashion e-commerce platform with real inventory management underneath it — multi-warehouse stock, supplier restocking, and audit-logged stock movements, not just a shopping cart with a database.

## What is this?

Krateon is a single-seller e-commerce platform modeled on how an actual small retailer runs: products come in size variants, stock lives across multiple physical warehouses, running low triggers a restock request to a supplier, and every unit that moves in or out leaves an audit trail. It's a monorepo containing a Spring Boot REST API, a customer-facing storefront, and a separate internal admin dashboard.

The goal wasn't to build the simplest possible cart demo — it was to build the parts of e-commerce that are usually skipped: concurrency-safe checkout, real inventory constraints, and an admin surface that reflects the actual operational complexity of running a store.

## Why this project is different

- **Concurrency-safe stock deduction.** Checkout uses pessimistic row locking on the inventory row being decremented, wrapped in a transaction that rolls back cleanly on insufficient stock — two customers can't both "win" the last unit of a size.
- **A full supplier/restock lifecycle**, not just a stock number on a product. Warehouses hold inventory per size variant; when it runs low, an admin creates a restock request against a supplier; fulfilling it adds stock and logs the movement — all FK-consistent, all auditable.
- **Redis caching with correct invalidation**, including a subtle Jackson serialization edge case (see below) that was found, root-caused, and fixed rather than papered over.
- **A schema migration (size variants) applied safely to already-seeded, already-tested live data** — not just a `db.drop()` and reseed, but a transactional migration script that preserved existing inventory, cart, and order data while repointing it at the new variant model.
- **A cascading "force delete" with a hard, unbypassable safety check.** Admins can clean up mistakenly-created products even after they've accumulated inventory and restock history — but the moment real order or cart activity exists, force-delete refuses, full stop, no override.

## Architecture

```
krateon/
├── backend/    Spring Boot REST API (Java 17) — single source of truth, serves both frontends
├── frontend/   Customer storefront (React + Vite + TypeScript)
└── admin/      Admin dashboard (React + Vite + TypeScript) — separate app, separate deploy
```

Both frontends are independent Vite apps that talk to the same backend over REST, authenticated with JWTs (role claim of `CUSTOMER` or `ADMIN`, enforced server-side via Spring Security). The admin dashboard isn't a set of extra routes bolted onto the storefront — it's a fully separate application with its own auth flow, so a compromised or buggy storefront build can't touch admin capabilities, and the two can be deployed, scaled, or taken down independently.

## Tech stack

**Backend**
- Spring Boot 3.3, Java 17
- PostgreSQL + Spring Data JPA / Hibernate
- Redis (response caching, with explicit cache eviction on writes)
- Spring Security + JWT (stateless, role-based)
- Maven

**Frontend & Admin** (separate apps, same stack)
- React 19, TypeScript, Vite
- Tailwind CSS v4, shadcn/ui (on base-ui primitives)
- React Router

## Key features

**Customer-facing**
- Product browsing with category, price, and keyword filtering
- Size variants per product, with per-variant stock awareness
- Cart, checkout, and "buy now" (skip-the-cart) purchase flow
- Product reviews (gated to verified purchasers) and star ratings
- Wishlist
- Order history
- Best-sellers and recently-viewed sections

**Admin-facing**
- Product, category, and size-variant management (including safe delete and force-delete)
- Multi-warehouse inventory: stock levels per product/variant/warehouse, manual stock adjustment with reason codes, and a full stock-movement audit history per inventory row
- Supplier management and the full restock-request lifecycle (create → fulfill → stock added + logged)
- Order management with status transitions (guarded against invalid state changes)
- Review moderation (delete)
- Dashboard overview: product counts, low-stock alerts, pending restocks, order counts by status

## Interesting engineering problems solved

A few bugs that came up during development were worth solving properly rather than working around — each one is a small case study in itself:

- **A Redis cache bug that looked like an infrastructure outage.** `GET /api/categories` intermittently 500'd with a Jackson deserialization error. The actual cause: `Stream.toList()` returns an immutable, JDK-internal *final* class, and Jackson's default polymorphic-typing policy skips embedding a type id for any final class — so the cache *write* silently produced an untyped array that the cache *read* (against a generic `Object` target) couldn't deserialize. Root-caused via a real stack trace rather than guessed at, and fixed by switching the cache's Jackson typing strategy to one that doesn't carve out that exemption.
- **A CORS preflight trap.** With JWT auth wired through Spring Security's filter chain, the browser's `OPTIONS` preflight request — which never carries an `Authorization` header — was getting rejected by the security filter before it ever reached the CORS configuration, silently breaking every cross-origin request from both frontends. The fix is one line (`permitAll()` on `OPTIONS /**`), but it's the kind of one-liner you only get to by understanding *why* preflight requests are unauthenticated by design.
- **Migrating a live schema without losing data.** Introducing size variants meant every `Inventory`, `CartItem`, `OrderItem`, and `RestockRequest` row needed to be repointed from `Product` to a new `ProductVariant` entity — on a database that already had real seeded and tested data in it. Done as a single transactional migration script, verified with a full regression pass afterward rather than a `git reset` and reseed.
- **Designing "force delete" as a safety problem, not a database problem.** The naive version of "let admins delete anything" is a data-loss incident waiting to happen. The actual design question was: what's the one check that must never, under any circumstance, be bypassed? The answer — no real order or cart activity — is checked first, unconditionally, before any cascading delete touches a single row, and that check has no override path.

## How to Run Locally

### Prerequisites
- Java 17
- Maven
- PostgreSQL (a local instance, or via Docker)
- Redis (a local instance, or via Docker)
- Node.js 18+

### Backend

```bash
# create the database
createdb krateon_db

cd backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
# edit application.properties: set your DB username/password and generate your own
# JWT secret (e.g. `openssl rand -hex 64`) - never reuse the placeholder

mvn spring-boot:run
```

The API runs on **http://localhost:8080**. On first run, Hibernate will create the schema (`spring.jpa.hibernate.ddl-auto=update`).

Redis must be reachable at the host/port configured in `application.properties` (defaults to `localhost:6379`) — e.g. `docker run -d -p 6379:6379 redis`.

### Customer storefront

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173**.

### Admin dashboard

```bash
cd admin
npm install
npm run dev
```

Runs on **http://localhost:5174**. Log in with an account whose role is `ADMIN` (the admin app rejects non-admin logins client-side after checking the role returned by the login response).

All three run independently and concurrently against the same backend.

## Known Limitations

Documented honestly rather than hidden:

- **Single-seller, not multi-vendor.** One store, one admin team, multiple warehouses — there's no concept of independent sellers on the platform.
- **No real payment gateway.** Checkout completes the order and deducts stock; there's no Stripe/PayPal integration.
- **A few admin data-visibility gaps**, tracked in `CLAUDE.md`:
  - The admin order list doesn't expose which customer placed an order, and there's no way to view an order's line-item detail without triggering a status change as a side effect.
  - There's no "list all reviews across all products" endpoint — the admin reviews page is product-lookup based instead.

## License

MIT
