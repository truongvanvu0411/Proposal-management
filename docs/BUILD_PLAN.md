# Proposal Management - Full Stack Build Plan

## 1. Current repo status

- Frontend: Vite + React + TypeScript + Tailwind CSS.
- Main app file: `src/App.tsx`.
- Domain types: `src/types.ts`.
- Historical mock seed data: `src/lib/dummyData.ts`.
- Current MVP persistence: PostgreSQL through the backend API after login.
- Backend: Express TypeScript server under `server/`.
- Database: Prisma/PostgreSQL schema, migration, and seed are implemented.
- File storage: S3-compatible storage wrapper and MinIO local compose are implemented. Product image URL input remains available for MVP usage.
- Generated project documents: proposal PPTX and P/L XLSX are generated from `template/`, stored through the S3-compatible storage wrapper, and saved as project-owned file metadata for later download.
- AI/Gemini: `GEMINI_API_KEY` is still frontend-configured from the AI Studio prototype and should move to backend before AI features are productionized.

## 2. Recommended target stack

Use the existing React app as the frontend and add a TypeScript backend in the same repo.

- Frontend: React, Vite, React Router, Tailwind.
- Backend: Node.js + Express + TypeScript.
- Database: PostgreSQL.
- ORM/migrations: Prisma.
- File storage local: MinIO using S3-compatible API.
- File storage production: AWS S3, Cloudflare R2, or Supabase Storage.
- Auth: JWT access token + refresh token, bcrypt password hashing.
- Validation: Zod shared between API requests and backend services.
- API style: REST first, with OpenAPI documentation.
- Background jobs: BullMQ + Redis later if export/PPTX/order workflows become heavy.
- Deployment: Docker Compose for local, then Render/Fly.io/Railway/AWS depending on budget.

## 3. Proposed repo structure

```text
Proposal-management/
  src/                    # existing React frontend
  server/
    src/
      app.ts              # Express app setup
      main.ts             # server bootstrap
      config/
      db/
      modules/
        auth/
        users/
        suppliers/
        clients/
        products/
        projects/
        proposals/
        orders/
        change-requests/
        files/
        exports/
        ai/
      middleware/
      shared/
    prisma/
      schema.prisma
      migrations/
      seed.ts
  docs/
  docker-compose.yml
  .env.example
```

## 4. PostgreSQL data model

Core tables:

- `users`: login identity, email, password hash, role, optional supplier relation.
- `suppliers`: supplier master data.
- `clients`: client/customer master data.
- `categories`: product category master.
- `products`: name, description, JAN code, type, cost, list price, min lot, lead time, supplier, status, current version.
- `product_versions`: historical product cost/price/description snapshots.
- `files`: storage metadata: bucket, key, original name, MIME type, size, checksum, uploader, owner type/id.
- `product_images`: relation between products and uploaded image files.
- `product_attachments`: relation between products and spec/manual/certification files.
- `projects`: sales proposal project, client, optional assigned sales user, status, totals, created/updated timestamps.
- `project_products`: selected products in a project, comment, cost, selling price, quantity, adopted flag, order status.
- `proposals`: generated/sent proposal document records.
- `proposal_items`: products included in a proposal and per-product comments.
- `order_requests`: new/additional orders, delivery date/location, supplier, status.
- `change_requests`: supplier cost-change and cancel-proposal workflows.
- `profit_and_loss`: calculated cost/revenue/margin rows per project or project product.
- `audit_logs`: important state changes, approvals, deletions, login events.

Important constraints:

- Use UUID primary keys.
- Add indexes for `status`, `supplier_id`, `client_id`, `created_at`.
- Keep money fields as integer minor units or `Decimal`, not float.
- Keep audit data append-only.
- Soft delete master data where business history depends on it.

## 5. Backend modules and APIs

Auth:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Users and RBAC:

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `POST /api/users/:id/reset-password`
- `DELETE /api/users/:id`
- Roles: `ADMIN`, `SALES`, `PRODUCT_MANAGER`, `SUPPLIER`.
- Admin has full permissions and owns user CRUD.
- Product manager can manage product/project workflows, exports, order tracking, and project assignment to Sales. Product manager can read only active Sales users from the user list for assignment.
- Sales sees only projects assigned to their own user and the product catalog.
- Supplier users are tied to a supplier, scoped to supplier-owned product workflows, and can view only projects/order notifications after their supplier's products have been switched to order handling (`発注依頼済み`). Internal proposal-only candidate projects are not exposed to suppliers.

Suppliers:

- `GET /api/suppliers`
- `POST /api/suppliers`
- `PATCH /api/suppliers/:id`
- `DELETE /api/suppliers/:id`

Clients:

- `GET /api/clients`
- `POST /api/clients`
- `PATCH /api/clients/:id`
- `DELETE /api/clients/:id`

Products:

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- `POST /api/products/:id/submit`
- `POST /api/products/:id/approve`
- `POST /api/products/:id/reject`
- `GET /api/products/:id/versions`

Projects:

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/products`
- `PATCH /api/projects/:id/products/:productId`
- `DELETE /api/projects/:id/products/:productId`
- `POST /api/projects/:id/adopt`
- `POST /api/projects/:id/reject`

Orders:

- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`

Change requests:

- `GET /api/change-requests`
- `POST /api/change-requests`
- `POST /api/change-requests/:id/approve`
- `POST /api/change-requests/:id/reject`

Files:

- `POST /api/files/presign-upload`
- `POST /api/files/complete-upload`
- `GET /api/files/:id/download-url`
- `DELETE /api/files/:id`

Exports:

- `GET /api/exports/projects.csv`
- `GET /api/exports/product-master.csv`
- `GET /api/exports/web-listing.csv`
- `GET /api/exports/internal-master.csv`
- `GET /api/exports/orders.csv`

Project documents:

- `GET /api/projects/:id/documents`
- `POST /api/projects/:id/documents/proposal-pptx`
- `POST /api/projects/:id/documents/pl-xlsx`

Document generation defaults to reusing the latest READY project file. Passing `{ "force": true }` creates and stores a new version. The current P/L template supports up to 12 project product rows. Proposal PPTX generation uses stored product images first, then catalog image URL/asset fallbacks; P/L rows write cached revenue, cost total, gross profit, margin, and `倉庫`/`直送` delivery labels.

AI:

- `POST /api/ai/proposal-comment`
- `POST /api/ai/proposal-summary`

The Gemini key should stay only in backend env. The frontend should call `/api/ai/*`.

## 6. File storage design

Local development:

- Run MinIO in Docker Compose.
- Store files in buckets such as `proposal-management-dev`.
- Save only metadata and object keys in PostgreSQL.
- Generate short-lived presigned upload/download URLs.

Production:

- Use S3/R2/Supabase Storage with the same S3-compatible service wrapper.
- Keep files private by default.
- Public product images can be served through signed CDN URLs later if needed.

Upload flow:

1. Frontend requests upload URL with filename, MIME type, size, and owner info.
2. Backend validates auth, role, file type, and size.
3. Backend returns presigned PUT URL and file draft ID.
4. Frontend uploads directly to storage.
5. Frontend calls complete endpoint.
6. Backend verifies and attaches file to product/project/proposal.

## 7. Frontend migration plan

Phase 1:

- Add `src/api/client.ts` for typed API calls.
- Add React query/state layer, for example TanStack Query.
- Replace `dummyData` reads page by page.
- Keep current UI mostly intact.

Phase 2:

- Add real login page and auth guard.
- Load current user from `/api/auth/me`.
- Hide/show actions by role.

Phase 3:

- Replace product CRUD with API.
- Add real upload UI for product images and attachments.
- Replace supplier/client/project CRUD with API.

Phase 4:

- Add proposal document export, P/L export, CSV export, and AI endpoints.
- Add approval/change request flows.
- Add audit trail views if required.

## 8. Implementation milestones

Milestone 1 - Foundation:

- Add `server/` Express app.
- Add Docker Compose for PostgreSQL and MinIO.
- Add Prisma schema, migrations, and seed.
- Add health check: `GET /api/health`.

Milestone 2 - Auth and master data:

- Implement auth, users, suppliers, clients, categories.
- Seed admin user and sample data from `dummyData`.
- Add frontend API client and replace supplier/client screens.

Milestone 3 - Products and files:

- Implement products, versions, approval status.
- Implement file metadata and presigned upload.
- Replace product catalog data source.

Milestone 4 - Projects and proposals:

- Implement projects, project products, P&L calculations.
- Implement proposal records, generated document storage, and export metadata.
- Replace project wizard and management screens.

Milestone 5 - Orders and change requests:

- Implement order request lifecycle.
- Implement supplier change request approval workflow.
- Add role-based supplier access.

Milestone 6 - Hardening:

- Add tests for services and critical API routes.
- Add request validation and error standardization.
- Add audit logs.
- Add Docker production build and deployment guide.

## 9. Local development commands to target

```bash
npm install
npm run dev              # frontend
npm run server:dev       # backend
npm run db:migrate       # Prisma migrations
npm run db:seed          # seed sample data
npm run lint             # TypeScript check
npm run build            # frontend build
docker compose up -d     # PostgreSQL + MinIO
```

## 10. Immediate next build task

Core MVP status:

1. Foundation backend, PostgreSQL schema, migration, and seed are implemented.
2. Local Docker Compose for PostgreSQL and MinIO is implemented.
3. Auth, suppliers, clients, files, products, and projects APIs are implemented.
4. Frontend login and core data loading now use the API instead of `dummyData` as the source of truth.
5. Product approval flow is implemented for MVP product edits.
6. CSV exports are implemented for project, product master, web listing, internal master, and order datasets.
7. Proposal PPTX and P/L XLSX generation are implemented from the provided templates, with generated files saved for later download.

Next phase:

1. Add full order lifecycle APIs and UI persistence.
2. Add richer proposal/P&L field mapping after final template tokens are standardized.
3. Move Gemini usage behind backend AI endpoints.
4. Add deployment packaging and production runtime checks.
