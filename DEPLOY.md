# Deploying Krateon

Vercel hosts the two React apps. It cannot run the Spring Boot backend (no Java runtime, no long-lived
servers), so the backend runs as a Docker container on Render or Railway. Postgres and Redis can be
added from the Vercel Marketplace (Neon + Upstash) or from the backend host.

```
Vercel: frontend (storefront)   Vercel: admin   ->   Backend (Docker)   ->   Postgres + Redis
```

## 1. Push the repo to GitHub
All three hosts deploy from Git. Commit the new files (`backend/Dockerfile`,
`application-prod.properties`, both `vercel.json`) and push.

## 2. Postgres and Redis
- **Postgres** - Neon (Vercel Marketplace > Storage) or Render/Railway Postgres. Convert the connection string
  to JDBC form: `postgresql://USER:PASS@HOST/DB?sslmode=require` becomes
  `DB_URL=jdbc:postgresql://HOST/DB?sslmode=require`, `DB_USER=USER`, `DB_PASSWORD=PASS`.
- **Redis** - Upstash (Vercel Marketplace > Storage) or Render/Railway Redis. Use the TLS URL:
  `REDIS_URL=rediss://default:PASSWORD@HOST:6379`.

## 3. Backend (Render, Docker)
New Web Service > connect the repo > Root directory `backend` > Runtime Docker. Environment variables:

| Variable | Value |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | from step 2 |
| `REDIS_URL` | from step 2 |
| `JWT_SECRET` | `openssl rand -hex 64` (new value, not the local one) |
| `CORS_ALLOWED_ORIGINS` | `https://YOUR-STOREFRONT.vercel.app,https://YOUR-ADMIN.vercel.app` (set after step 4) |

Note the service URL, for example `https://krateon-api.onrender.com`. Check `/api/categories` returns `[]`.
Hibernate creates the tables on first start (`ddl-auto=update`).

## 4. Frontends (Vercel)
Create two projects from the same repo:

| Project | Root directory | Environment variables |
|---|---|---|
| storefront | `frontend` | `VITE_API_BASE_URL=https://krateon-api.onrender.com` |
| admin | `admin` | `VITE_API_BASE_URL=https://krateon-api.onrender.com`, `VITE_STOREFRONT_URL=https://YOUR-STOREFRONT.vercel.app` |

Framework preset: Vite (build `npm run build`, output `dist`). Then go back to the backend and set
`CORS_ALLOWED_ORIGINS` to the two Vercel URLs, and redeploy it.

## 5. First admin and data
Public registration always creates a CUSTOMER. Register on the storefront, then promote yourself:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

Then add categories, products, warehouses and stock in the admin app. Product images use Unsplash URLs
(the `image_url` field), so they work anywhere.

## Notes
- The Dockerfile pins the JVM timezone to UTC, which avoids the `Asia/Calcutta` Postgres error seen locally.
- Free Render services sleep when idle, so the first request can take about 30 seconds.
- Checkout has no real payment gateway; the order completes and stock is deducted.
