# LeanBloom API Documentation

Interactive Swagger UI is served by the backend:

| Resource | URL |
|----------|-----|
| **Swagger UI** | http://localhost:4000/api/docs |
| **OpenAPI JSON** | http://localhost:4000/api/docs.json |

## Quick start

1. Start the API: `cd backend && npm run dev`
2. Open http://localhost:4000/api/docs
3. Call **POST `/api/auth/login`** (Try it out) with admin or affiliate credentials
4. Click **Authorize**, paste the JWT token
5. Call protected endpoints

### Seed credentials (from `sql/002_seed.sql`)

| Portal | Email | Password |
|--------|-------|----------|
| Admin | `john.admin@leanbloom.com` | `MasterAdmin2026!` |
| Affiliate | `contact@wellnesspartner.com` | `PartnerSecure2026!` |

## API groups

- **Auth** — login, affiliate signup, `/me`
- **Admin — Affiliates** — CRUD + logo upload
- **Admin — Products** — catalog CRUD + image upload
- **Affiliate Portal** — dashboard, products/pricing, patients, orders, commissions, payments

## Spec source

OpenAPI 3 document lives in `src/docs/openapi.ts` and is mounted via `src/docs/swagger.ts`.
