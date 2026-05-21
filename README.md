<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Proposal Management

This repository contains a Proposal Management MVP with a Vite React frontend and an Express/PostgreSQL backend.

View the original AI Studio app: https://ai.studio/apps/7b05f12a-91f6-4830-b1aa-84e6078226b2

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS.
- Backend: Express, TypeScript, Prisma, Zod.
- Database: PostgreSQL.
- File storage: S3-compatible API, with MinIO for local development.
- Auth: local email/password with JWT access and refresh tokens.
- Core MVP data source: suppliers, clients, products, and projects are loaded from the API after login.
- Generated documents: project proposal PPTX and P/L XLSX are generated from files in `template/`, stored in S3-compatible storage, and tracked in the database.

## Run Locally

**Prerequisites:** Node.js and Docker.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set real local values for:

   - `DATABASE_URL`
   - `POSTGRES_PASSWORD`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `SEED_ADMIN_PASSWORD`
   - `SEED_SUPPLIER_PASSWORD` if you want a separate seeded supplier password
   - `MINIO_ROOT_USER`
   - `MINIO_ROOT_PASSWORD`
   - `S3_*`
   - `GEMINI_API_KEY` if AI endpoints are added later

3. Start local infrastructure:

   ```bash
   docker compose up -d
   ```

4. Generate Prisma client, migrate the database, and seed sample data:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. Run the backend:

   ```bash
   npm run server:dev
   ```

6. Run the frontend in another terminal:

   ```bash
   npm run dev
   ```

## API

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/users`
- `POST /api/users/:id/reset-password`
- `GET/POST/PATCH/DELETE /api/suppliers`
- `GET/POST/PATCH/DELETE /api/clients`
- `GET/POST/PATCH/DELETE /api/products`
- `GET /api/products/:id/images`
- `POST /api/products/:id/images`
- `PATCH /api/products/:id/images/order`
- `DELETE /api/products/:id/images/:imageId`
- `POST /api/products/:id/approve`
- `POST /api/products/:id/reject`
- `GET/POST/PATCH/DELETE /api/projects`
- `POST /api/files/presign-upload`
- `POST /api/files/complete-upload`
- `GET /api/files/:id/download-url`
- `GET /api/projects/:id/documents`
- `POST /api/projects/:id/documents/proposal-pptx`
- `POST /api/projects/:id/documents/pl-xlsx`
- `GET /api/exports/projects.csv`
- `GET /api/exports/product-master.csv`
- `GET /api/exports/web-listing.csv`
- `GET /api/exports/internal-master.csv`
- `GET /api/exports/orders.csv`

CSV exports require a bearer token and return UTF-8 with BOM for Excel-friendly Japanese/Vietnamese text. Export endpoints are available to `ADMIN` and `PRODUCT_MANAGER`.

Project document generation requires a bearer token and is available to `ADMIN` and `PRODUCT_MANAGER`. By default, generation endpoints reuse the latest READY file for the project and document type. Send `{ "force": true }` to regenerate and store a new version.

User and project access:

- `ADMIN` can manage all users, master data, products, projects, files, approvals, and exports.
- `PRODUCT_MANAGER` can create/manage projects, select catalog products, generate proposal and P/L files, track orders, assign projects to `SALES`, and view product/supplier/client master data. Product, supplier, and client mutation APIs are admin/supplier-owned only as described below.
- `SALES` can view only projects assigned to their own user and can view the product catalog.
- `SUPPLIER` can manage products for their own supplier scope and can view only projects where their products have been explicitly switched to order handling (`発注依頼済み`). Proposal-only candidate projects remain hidden from suppliers.

Generated document storage:

- Proposal PPTX source template: `template/Product_Proposal_Green_Theme.pptx`
- P/L XLSX source template: `template/japanese_jissen_pl_template.xlsx`
- Stored file purpose values: `PROJECT_PROPOSAL_PPTX`, `PROJECT_PL_XLSX`
- P/L template supports up to 12 project product rows in this MVP.

Product image upload:

- Supplier users are the primary upload actor and can create/update/upload images only for their own supplier products.
- Admin can manage product records, product images, and product approvals for support/governance.
- Product managers can view and select products but cannot create, update, delete, upload product images, or approve/reject product changes.
- Supplier-entered product prices are treated as `原価`; project selling prices are entered per project as `提案価格`.
- Sales cannot upload or delete product images.
- Product images are uploaded as `multipart/form-data`, normalized server-side to JPEG, stored in MinIO/S3, and returned to the UI as signed download URLs.
- The proposal PPTX generator embeds stored product images when available and falls back to catalog image URLs/assets for seeded or legacy products. The comparison slide also maps per-product `売上`.

## MVP Notes

- The login screen uses the seeded admin account from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
- `db:seed` also creates a supplier user from `SEED_SUPPLIER_EMAIL`, plus sample product manager and sales users. If `SEED_SUPPLIER_PASSWORD` is omitted locally, it uses `SEED_ADMIN_PASSWORD`.
- Product edits create a pending approval state; approve/reject actions are available to admins from the approvals screen.
- Product image URL input has been replaced by multi-image upload for supplier-owned product registration/update.
- The export screen downloads CSV files from the API for project summary, product master, web listing, internal master, and order history data.
- The project detail screen can generate, download, and regenerate proposal PPTX and P/L XLSX files.
- Draft projects can be saved with only a title and client, then edited later from the project list/detail.
- Project products carry a delivery method (`倉庫` or `直送`), and order requests are created only after the project is marked as won and a product is explicitly switched to order handling. Creating the order request also sends an `ORDER_REQUESTED` notification to the matching supplier users.
- AI, ZIP image batch export, deployment hardening, and full order lifecycle are intentionally outside this MVP phase.

## Verification

```bash
npm run lint
npm run build
npm test
```

Database verification requires Docker services to be running:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Single EC2 Demo Deployment

This repo includes a Docker Compose deployment kit for running the full demo stack on one AWS EC2 instance:

- `Dockerfile`
- `docker-compose.prod.yml`
- `Caddyfile`
- `.env.prod.example`
- `scripts/aws-ec2-bootstrap.sh`
- `scripts/deploy-prod.sh`
- `scripts/backup-prod.sh`

See [docs/aws-ec2-deploy.md](docs/aws-ec2-deploy.md) for the AWS manual steps and deploy commands.
For command-line EC2 provisioning, see [docs/aws-cli-provision.md](docs/aws-cli-provision.md).
