# UAT Execution Report - Product Proposal & Procurement

**Run date:** 2026-05-14 23:51 JST  
**Test case source:** `req/uat_testcases_product_proposal_procurement.md`  
**Environment:** Local full-stack MVP  
**Frontend:** `http://localhost:3000`  
**Backend API:** `http://localhost:4000/api`  
**PostgreSQL:** Docker, host port `55433`  
**MinIO:** Docker, API `9000`, console `9001`  
**Seeded admin:** `admin@example.com` (password from local `.env`, not recorded here)

---

## 1. Executive Summary

| Area | Result | Notes |
|---|---:|---|
| Automated Core MVP API/DB checks | PASS 26 / FAIL 0 | Auth, suppliers, clients, products, approval, projects, validation, file auth guard. |
| Browser UI checks | PASS 5 / FAIL 0 | Login, route guard, logout, catalog search by product name, catalog search by supplier name. |
| CSV export checks | PASS | Backend CSV endpoints tested for auth, roles, headers, content, escaping, filtering, and audit log. |
| CSV export browser smoke | PASS | Admin clicked 5 export cards and downloaded 5 CSV files from `/exports`. |
| Project document generation checks | PASS API | Proposal PPTX and P/L XLSX generation, reuse, regeneration, listing, auth, role denial, and P/L row limit are covered by backend tests. |
| Audit log DB checks | PASS | Required audit actions exist in `AuditLog`. |
| Regression checks | PASS 5 / FAIL 0 | Prisma generate, Prisma validate, lint/typecheck, Vitest, production build. |
| Core MVP UAT cases | PASS for tested MVP scope | API/DB layer pass; critical browser auth/search checks pass. UI form click-through CRUD can still be used as final demo smoke. |
| Full Scope / Future UAT cases | BLOCKED | Not implemented in current Core MVP scope. |

**Conclusion:** Core MVP backend persistence, CSV export, proposal PPTX generation, P/L XLSX generation, and API behavior are usable for local full-stack testing. The app is not yet complete against the full original spec because supplier portal, advanced P/L fee modeling, full adoption workflow, full order workflow, image ZIP export, and audit UI are not implemented yet.

---

## 2. Automated Run Evidence

### 2.1 API/DB UAT

Executed against running local backend and Docker database.

| Check group | Result |
|---|---|
| API health | PASS |
| Login success / wrong password / protected auth | PASS |
| Supplier create / update / validation / soft delete | PASS |
| Client create / update / validation / soft delete | PASS |
| Product create / validation / list DTO / category upsert | PASS |
| Product pending approval / approve / reject / soft delete | PASS |
| Project create / update totals / persistence / soft delete | PASS |
| Standard validation error shape | PASS |
| File presign unauthenticated guard | PASS |

API script result:

```text
pass: 26
fail: 0
```

### 2.2 Audit Log DB Verification

Verified action counts exist for:

```text
AUTH_LOGIN
SUPPLIER_CREATE, SUPPLIER_UPDATE, SUPPLIER_DELETE
CLIENT_CREATE, CLIENT_UPDATE, CLIENT_DELETE
PRODUCT_CREATE, PRODUCT_UPDATE_REQUEST, PRODUCT_APPROVE, PRODUCT_REJECT, PRODUCT_DELETE
PROJECT_CREATE, PROJECT_UPDATE, PROJECT_DELETE
```

Result: PASS, no missing audit action in DB.

### 2.3 Browser UI Verification

Executed with headless Microsoft Edge through Chrome DevTools Protocol.

| UI Check | Result |
|---|---|
| Anonymous user opens `/projects` | PASS, redirected to `/login`. |
| Admin login form | PASS, entered app and access token was stored. |
| Catalog search by product name | PASS, verified with `ノイズキャンセリング ワイヤレスイヤホン V2`. |
| Catalog search by supplier name | PASS, verified with `テック用品工業`. |
| Logout | PASS, token cleared and internal route redirected back to `/login`. |

Browser UI script result:

```text
pass: 5
fail: 0
```

### 2.4 Regression Commands

| Command | Result |
|---|---|
| `npm run db:generate` | PASS |
| `npx prisma validate` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS, 7 tests passed |
| `npm run build` | PASS |

Build note: Vite emitted a large chunk warning for the frontend bundle. This is not a functional failure.

### 2.5 CSV Export Verification

| Export | Result | Notes |
|---|---|---|
| `projects.csv` | PASS | Project totals and product/adoption counts exported. |
| `product-master.csv` | PASS | Product, supplier, category, JAN, cost, price, lot, lead time exported. |
| `web-listing.csv` | PASS | Publishable adopted products exported; cost/supplier/profit fields excluded. |
| `internal-master.csv` | PASS | Internal cost, supplier, adoption metadata, publish/order flags exported. |
| `orders.csv` | PASS | Existing order request rows exported with project/client/supplier context. |
| Auth/role control | PASS | Unauthenticated requests rejected; supplier role denied restricted CSVs. |
| CSV format | PASS | UTF-8 BOM, deterministic headers, quote/comma/newline escaping verified. |
| Audit | PASS | `EXPORT_CSV` audit log written with dataset and row count. |
| Browser download | PASS | `/exports` produced `projects`, `product-master`, `web-listing`, `internal-master`, and `orders` CSV downloads. |

### 2.6 Project Document Generation Verification

| Check | Result | Notes |
|---|---|---|
| Unauthenticated request | PASS | Document generation rejects missing bearer token. |
| Supplier role denial | PASS | Supplier users cannot generate project documents. |
| Proposal PPTX generation | PASS API | A project proposal `.pptx` is generated from the provided template and stored as a READY project file. |
| P/L XLSX generation | PASS API | A project P/L `.xlsx` is generated from the provided template and stored as a READY project file. |
| Reuse latest file | PASS API | Default generation reuses the latest READY file for the project and document type. |
| Regenerate new version | PASS API | `force=true` creates a new stored file version. |
| Document listing | PASS API | Project document list returns latest stored generated files with download URLs. |
| P/L row limit | PASS API | More than 12 project product rows returns a clear validation error. |
| Audit | PASS API | `DOCUMENT_GENERATE` and `DOCUMENT_REUSE` audit actions are written. |

---

## 3. Core MVP UAT Status

| ID | Status | Evidence / Notes |
|---|---|---|
| UAT-AUTH-001 | PASS API/UI | Login with seeded admin returns access token, browser enters app, and protected data loads. |
| UAT-AUTH-002 | PASS API | Wrong password rejected with `401`. |
| UAT-AUTH-003 | PASS API/UI | `/api/auth/me` rejects missing token; browser `/projects` redirects to `/login`. |
| UAT-AUTH-004 | PASS API/UI | Logout endpoint returns `204`; browser logout clears token and redirects to login. |
| UAT-MST-001 | PASS API/DB | Supplier created and visible in list before cleanup. |
| UAT-MST-002 | PASS API | Invalid supplier email rejected. |
| UAT-MST-003 | PASS API/DB | Supplier phone updated and persisted. |
| UAT-MST-004 | PASS API/DB | Supplier soft-deleted and hidden from list. |
| UAT-MST-005 | PASS API/DB | Client created and usable for project create. |
| UAT-MST-006 | PASS API/DB | Client phone updated and persisted. |
| UAT-MST-007 | PASS API/DB | Client soft-deleted and hidden from list. |
| UAT-PRD-001 | PASS API/DB | Product created with supplier/category denormalized DTO. |
| UAT-PRD-002 | PASS API | Invalid product payload rejected. |
| UAT-PRD-003 | PASS DB | Category upsert verified; latest UAT category exists once, not duplicated. |
| UAT-PRD-004 | PASS UI | Browser catalog search by product name verified. |
| UAT-PRD-005 | PASS UI | Browser catalog search by supplier name verified. |
| UAT-PRD-006 | PASS API/DB | Product edit creates `PENDING_APPROVAL`; main cost remains old before approval. |
| UAT-PRD-007 | PASS API/DB | Approve applies pending version and returns product to `ACTIVE`. |
| UAT-PRD-008 | PASS API/DB | Reject returns product to `ACTIVE` without applying pending money values. |
| UAT-PRD-009 | PASS API/DB | Product soft-deleted and hidden from list. |
| UAT-PROJ-001 | PASS API/DB | Project created with client and product. |
| UAT-PROJ-002 | PASS API/DB | Revenue and profit recalculated correctly for updated project products. |
| UAT-PROJ-003 | PASS API/DB | Project status/product conditions updated. |
| UAT-PROJ-004 | PASS API/DB | Project soft-deleted and hidden from list. |
| UAT-APR-001 | PASS API/DB | Product update moves to pending approval and creates version. |
| UAT-APR-002 | PASS API/DB | Pending product version approved and applied. |
| UAT-APR-003 | PASS API/DB | Pending product version rejected without applying values. |
| UAT-AUD-001 | PASS DB | `AUTH_LOGIN` logs exist. |
| UAT-AUD-002 | PASS DB | Create/update/delete logs exist for master/product/project operations. |
| UAT-NFR-001 | PASS API/DB | Data persisted across independent API reads before cleanup. |
| UAT-NFR-002 | PASS API | Invalid payload returns standard JSON error shape. UI error display still recommended for manual check. |
| UAT-EXP-001 | PASS API | Web listing CSV implemented for adopted publishable products and excludes internal cost/profit data. |
| UAT-EXP-002 | PARTIAL | CSV internal master implemented. Excel output is still future scope. |
| UAT-EXP-005 | PASS API | Supplier role is denied restricted export CSV endpoints. Sales is limited to `projects.csv`. |
| UAT-PROP-002 | PARTIAL API | Project proposal PPTX generation/download storage is implemented from the provided template. Full proposal builder/reorder/image-rich mapping remains future scope. |
| UAT-PROP-003 | PASS API | Generated proposal mapping excludes supplier cost/internal P/L fields. |
| UAT-PL-002 | PARTIAL API | Project P/L XLSX generation/download storage is implemented from the provided template. Advanced fee model remains future scope. |

---

## 4. Smoke Test Status

| ID | Status | Notes |
|---|---|---|
| SMOKE-001 | PASS | Docker services running, API health returns `ok`, frontend `/login` returns HTTP 200. |
| SMOKE-002 | PASS API/UI | Admin login API and browser login verified. |
| SMOKE-003 | PASS API / Manual UI recommended | Supplier create/persist verified through API/DB. |
| SMOKE-004 | PASS API / Manual UI recommended | Client create/persist verified through API/DB. |
| SMOKE-005 | PASS API / UI search verified | Product create/list verified through API/DB; catalog search verified in browser. |
| SMOKE-006 | PASS API / Manual UI recommended | Product edit moved to pending approval. |
| SMOKE-007 | PASS API / Manual UI recommended | Product approve applied new values. |
| SMOKE-008 | PASS API / Manual UI recommended | Project create and totals verified. |
| SMOKE-009 | PASS API/UI | Logout/login API and browser logout redirect verified. |

---

## 5. Full Scope / Future UAT Status

These cases are not passable yet because they belong to modules outside the current Core MVP implementation.

| Group | IDs | Status | Reason |
|---|---|---|---|
| Supplier role/access control | UAT-AUTH-005, UAT-AUTH-006, UAT-AUTH-007, UAT-AUTH-008 | BLOCKED | Supplier/Sales role UI and audit log UI are not implemented. |
| Supplier product portal and file upload UI | UAT-PRD-010, UAT-PRD-011, UAT-PRD-012, UAT-PRD-013, UAT-PRD-014 | BLOCKED | Supplier portal, duplicate product, and full upload validation UI are not implemented. |
| Proposal creation/export | UAT-PROP-001, UAT-PROP-004, UAT-PROP-005 | BLOCKED | Full proposal builder, product reorder, and post-export selling price workflow are not implemented. PPTX generation from project data is partially implemented. |
| Advanced P/L | UAT-PL-001, UAT-PL-003 | BLOCKED | Shipping/processing/other fee model and final zero-revenue business rule are not implemented. Basic Excel generation from project products is partially implemented. |
| Adoption | UAT-ADP-001 to UAT-ADP-005 | BLOCKED | Adoption records, company product code, CSV import, and notification are not implemented. |
| Web/Internal exports | UAT-EXP-003, UAT-EXP-004 | BLOCKED | Image batch export and final publicability business workflow are not implemented. CSV export base is implemented. |
| Order request workflow | UAT-ORD-001 to UAT-ORD-008 | BLOCKED | Order request UI/API lifecycle is not implemented for full scope. |
| Change request workflow | UAT-APR-004 to UAT-APR-008 | BLOCKED | Supplier change request/cancel request workflow is not implemented. |
| Advanced audit/history | UAT-AUD-003 to UAT-AUD-005 | BLOCKED | Before/after audit UI, product history UI, and order timeline are not implemented. |
| Non-functional full-scope | UAT-NFR-003 to UAT-NFR-006 | BLOCKED | Large data search, full upload/download, export performance, and supplier-facing data leakage tests require missing modules. |

---

## 6. Findings

1. Core MVP API/DB behavior is healthy and ready for manual browser demo.
2. No functional failure was found in the automated Core MVP API/DB scope.
3. Browser click-through UAT passed for redirect, login, logout, and catalog search using headless Edge. UI form create/update/delete flows are still best used as a final stakeholder demo smoke because the automated suite exercises those workflows mainly through API/DB.
4. Full original spec is not complete yet. The next implementation phase should focus on supplier portal, richer proposal/P&L template mapping, full adoption workflow, image ZIP exports, order workflow, and richer audit/history.

---

## 7. Recommended Manual Browser Checklist

Use this short checklist before demoing to stakeholders:

| Step | Expected |
|---|---|
| Open `http://localhost:3000/login` | Login page renders. |
| Login as seeded admin | Dashboard opens and data loads. |
| Open `/projects` while logged out | App redirects to login. |
| Create supplier/client/product/project from UI | Data saves and remains after refresh. |
| Search product by name and supplier in catalog | Filtered list is correct. |
| Edit product, approve/reject from approval screen | Status and prices update as expected. |
| Open a project detail and generate proposal PPTX/P&L XLSX | File buttons return downloadable generated files and show stored documents on reload. |
| Logout, then reopen internal page | User is sent back to login. |
