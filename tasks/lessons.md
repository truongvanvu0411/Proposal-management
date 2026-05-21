# Lessons

## 2026-05-20 Local Frontend Must Use Vite Proxy Instead Of Static Dist

- Symptom: Local login failed with `Network request failed`, browser console showed CSP blocks against `http://localhost:4000/api/auth/login`, and the manual link on `localhost:3000` could bounce back to the homepage.
- Root Cause: Port `3000` was being served by `serve -s dist` instead of Vite dev, while the frontend env still pointed `VITE_API_BASE_URL` at an absolute backend origin. The static server redirected `/manual.html` to `/manual`, and the absolute API origin violated same-origin CSP in the local browser context.
- Fix: Resolve frontend API calls to same-origin `/api` on localhost, add a Vite dev proxy from `/api` to `http://localhost:4000`, keep the manual link on `/manual.html`, and run local frontend through `npm run dev` instead of a static dist server.
- Prevention Rule: For local web development, run the frontend through the repo's dev server with same-origin API proxying; do not point browser code at absolute localhost backend URLs or replace the dev server with a static dist host on the same port.
- Example: `http://localhost:3000/api/auth/login` now proxies to the backend and returns `200`, while `http://localhost:3000/manual.html` opens directly without redirecting to a missing React route.

## 2026-05-17 Product API 400 Error Clarity

- Symptom: Product registration or image upload could surface only `Request failed with status 400` in the UI.
- Root Cause: The image upload endpoint returned a non-standard 400 body with `rejected` instead of an `error` envelope, while the frontend error parser only read `error.message`.
- Fix: Return standard `ApiError` envelopes for all-rejected image uploads, preserve rejected details, and make the frontend parse API errors, validation details, and legacy rejected arrays.
- Prevention Rule: Any non-2xx API response must include a stable `error.code` and `error.message`; frontend API helpers must centralize error parsing.
- Example: An unsupported product image now returns `UNSUPPORTED_IMAGE_TYPE` with the message `Only JPEG, PNG, and WebP images are supported.` instead of a generic status message.

## 2026-05-17 Product Supplier Validation

- Symptom: Product creation could be attempted with an empty or fake supplier id from the frontend.
- Root Cause: The product form allowed empty supplier selection and the frontend used a generated fallback supplier id; the backend relied on database constraints for unknown suppliers.
- Fix: Require a supplier in the product form for non-supplier users, remove the fake fallback id, and validate supplier existence in the backend before create/update.
- Prevention Rule: Never use synthetic ids for relational fields in client payloads; validate relation existence before write operations.
- Example: Creating a product with `supplierId: "supplier-missing"` now returns `SUPPLIER_NOT_FOUND`.

## 2026-05-17 System Popup UX Consistency

- Symptom: Delete confirmations and mutation failures used browser-native `confirm`/`alert`, which looked disconnected from the product UI.
- Root Cause: CRUD handlers called global browser dialogs directly instead of routing confirmations and notifications through app UI components.
- Fix: Add shared floating toast and confirm dialog components, wire deletes through the custom confirm dialog, and send mutation success/failure through toasts.
- Prevention Rule: Do not call `window.alert` or `window.confirm` from application workflows; use the shared notification and confirmation layer.
- Example: Deleting a product now opens the app-styled danger confirm dialog and shows a floating success or failure toast.

## 2026-05-17 Console Noise And Database Errors

- Symptom: Product creation failures appeared as `500 Unexpected server error`, and browser console also showed avoidable `auth/me` 401, favicon 404, and chart size warnings.
- Root Cause: Known Prisma constraint errors were not mapped to API errors, session restore called `/auth/me` before refresh when an old access token existed, no favicon asset was declared, and the chart used a responsive height path that could briefly measure as `-1`.
- Fix: Map Prisma unique/foreign-key/not-found errors to stable API responses, refresh sessions before calling `/auth/me`, add an SVG favicon, and give the Recharts container stable dimensions.
- Prevention Rule: Convert expected database constraint failures to typed API errors and keep browser console free of avoidable startup noise.
- Example: Registering a product with duplicate `janCode` now returns `409 UNIQUE_CONSTRAINT_FAILED` with `janCode already exists` instead of a 500.

## 2026-05-17 Frontend Unique Field Validation

- Symptom: Duplicate JAN code was only caught after submitting to the backend.
- Root Cause: The product form did not compare JAN input against the already loaded product list before submit.
- Fix: Add live duplicate JAN validation in the product modal, show an inline warning, disable submit, and keep a submit-time guard before API calls.
- Prevention Rule: Fields with known unique constraints should be validated in the frontend when the relevant dataset is already loaded, while preserving backend constraints as the final guard.
- Example: Typing an existing JAN now shows the existing product name immediately and prevents product registration.

## 2026-05-17 Unique Validation Must Check The Database

- Symptom: Duplicate JAN could still pass frontend validation after refresh and only fail when the backend wrote to the database.
- Root Cause: The frontend checked only the product list currently visible to the user, but database uniqueness also includes records outside that list, such as soft-deleted or stale records.
- Fix: Add a JAN availability API and call it from the product form during typing and again at submit time before create/update.
- Prevention Rule: Frontend unique validation can use local data for fast feedback, but must call a server availability check before submission when the database uniqueness scope is wider than the visible list.
- Example: `GET /api/products/jan-code-availability?janCode=4901112223334` now returns the existing product and the form blocks submission before POST.

## 2026-05-17 List Filter And Sticky Workspace UX

- Symptom: Long project/product workflows lost context while scrolling, and list pages looked underpowered because filtering was mostly search-only.
- Root Cause: The wizard relied on page scrolling instead of an internal scroll area, the sidebar did not explicitly own viewport height, and list/dashboard data views lacked dedicated filter state.
- Fix: Keep the project wizard header/footer and sidebar fixed, add status/client/composition/category/supplier filters to list screens, and add dashboard range/client/supplier filters for statistics.
- Prevention Rule: Screens used for repeated operations should preserve navigation/context while scrolling and expose filters that match the loaded data dimensions.
- Example: The dashboard can now show only this year's projects for a selected client and supplier, while the project wizard keeps the stepper and project summary visible.

## 2026-05-17 Generated Excel Font Consistency

- Symptom: Generated P/L Excel files could open with template-default fonts instead of the requested Japanese presentation font.
- Root Cause: The export only filled worksheet cells and did not normalize workbook styles.
- Fix: Rewrite XLSX `xl/styles.xml` font names to `Yu Mincho` after filling the worksheet.
- Prevention Rule: When a generated document has a visual standard, normalize style parts as well as cell content.
- Example: The generated P/L workbook now contains `Yu Mincho` in `xl/styles.xml`.

## 2026-05-17 Role Scope Must Be Enforced In API

- Symptom: UI role restrictions could still leave direct API access too broad for Sales or Product PIC users.
- Root Cause: Some endpoints relied on frontend visibility while backend role lists still included older Sales permissions.
- Fix: Scope Sales projects by `assignedSalesUserId`, restrict Sales away from user/master/export/document APIs, and limit Product PIC user lookup to active Sales users for assignment.
- Prevention Rule: Every UI permission rule needs a matching backend authorization rule and a regression test for direct API calls.
- Example: Sales can now fetch only their assigned projects, cannot create clients, and cannot export `projects.csv`.

## 2026-05-17 Verify Live Database Migrations

- Symptom: The dashboard showed `Unexpected server error` because `GET /api/projects` returned 500 in the running app.
- Root Cause: Tests used a fake database and passed, but the live PostgreSQL database had not applied the migration adding `Project.assignedSalesUserId`.
- Fix: Apply `20260517112000_add_user_management_project_assignment` to the live database and verify the endpoint with a real authenticated request.
- Prevention Rule: Any Prisma schema change must be followed by `prisma migrate status` and at least one real API call against the running database before marking done.
- Example: After `npx prisma migrate deploy`, `GET /api/projects` returned 200 instead of 500.

## 2026-05-17 Modal Overlays Must Be Visually Verified

- Symptom: The user edit popup was clipped at the bottom of the screen even though typecheck and build passed.
- Root Cause: The modal was rendered inside an animated page container; transformed ancestors can make `position: fixed` behave like it is fixed to the container instead of the viewport.
- Fix: Render user, supplier, and client master modals through a body-level portal and constrain tall forms with viewport-based `max-height` plus internal scrolling.
- Prevention Rule: Any popup, drawer, or overlay change must be checked in a real browser viewport, including confirming the action buttons are visible.
- Example: The user edit modal now reports a body-level overlay from top `0` to the viewport bottom, with `保存` and `キャンセル` visible.

## 2026-05-17 Supplier Project Scope Needs Server Ownership Filtering

- Symptom: Supplier users needed visibility into projects that use their products, but broad project access would expose other suppliers' products and internal financial totals.
- Root Cause: `/api/projects` previously returned an empty list for supplier users instead of a supplier-owned project projection.
- Fix: Scope supplier project reads through `ProjectProduct.product.supplierId`, return only matching project products/order requests, and mask project financial totals for supplier responses.
- Prevention Rule: External partner visibility must be implemented as a backend projection, not just a frontend filter.
- Example: A supplier user now sees a mixed-supplier project with only their own product and order request; revenue and profit are returned as `0`.

## 2026-05-17 Product Manager View-Only Master Permissions

- Symptom: Product Manager screens needed to be view/select only, but older UI and API permissions still allowed product and master-data mutations.
- Root Cause: Role intent changed after the original implementation, while frontend action visibility and backend `requireRole` lists were not updated together.
- Fix: Remove Product Manager from product/master-data mutation and approval roles, hide matching UI actions, and add regression coverage for direct API calls.
- Prevention Rule: When a role changes from manage to view-only, update menu visibility, action buttons, route guards, and backend authorization in the same change.
- Example: Product Manager can view products, suppliers, and clients, but direct POST/PATCH/DELETE calls now return 403.

## 2026-05-17 Adoption Must Not Imply Ordering

- Symptom: Checking `採用` during project creation moved products into order management before the project was marked as won.
- Root Cause: The UI and order creation logic treated `isAdopted` as both recommendation/adoption intent and order readiness.
- Fix: Keep `isAdopted` for proposal recommendation, use `allowOrder` for order conversion, and create order requests only when both are true.
- Prevention Rule: Proposal state and order state must remain separate flags when a workflow has an explicit conversion action.
- Example: A draft project product can be `採用推奨` and still remain outside `発注管理` until `発注に切り替える` is clicked after `成約`.

## 2026-05-17 Modal State Must Follow Reloaded Entity Data

- Symptom: Deleting a product image showed a success toast, but the open product modal still displayed the deleted image until refresh.
- Root Cause: The modal stored a stale `editingProduct` object and did not sync it after the parent product list reloaded.
- Fix: Sync the modal's active product from the latest `products` prop whenever product data changes.
- Prevention Rule: Any modal editing a copied entity object must update from canonical list data after successful mutations.
- Example: Product image deletion now disappears from the open detail modal as soon as the backend mutation and reload complete.

## 2026-05-17 Catalog Images Need Thumbnails

- Symptom: The catalog page became slow after adding dummy products from high-resolution local images.
- Root Cause: The UI loaded full-size JPG assets, including a 25MB image, directly inside product grids.
- Fix: Generate 640px WebP catalog thumbnails, seed catalog products with thumbnail URLs, and add lazy async image loading in product-heavy views.
- Prevention Rule: Grid/list thumbnails must use optimized derivatives, not original upload or source files.
- Example: Ten catalog thumbnails now total about 158KB instead of loading tens of megabytes of JPGs.

## 2026-05-17 Order Delivery Status Needs Role-Specific Transitions

- Symptom: After a project was won, there was no explicit supplier shipment step or product-manager receipt confirmation step.
- Root Cause: Order readiness and delivery tracking stopped at order creation, so supplier and product-manager responsibilities were not represented in API state transitions.
- Fix: Add `SHIPPED` and `RECEIVED` order statuses, expose a role-scoped order status endpoint, and show supplier/manager action buttons only for valid transitions.
- Prevention Rule: Workflow status changes that cross company boundaries must be enforced in the backend and reflected with role-specific UI actions.
- Example: A supplier can mark only their own adopted project order as `発送済み`, and Product Manager can mark it `受取済み` only after shipment.

## 2026-05-17 Theme Accent Drift

- Symptom: Tabs, buttons, focus rings, and title accents still used blue even after the system main color became green.
- Root Cause: UI classes used direct Tailwind `blue-*` utilities instead of the shared `primary` theme token.
- Fix: Replace blue utility classes with `primary`, `primary-light`, and green hover variants across the app.
- Prevention Rule: New UI accent colors should use semantic theme tokens rather than hard-coded hue utilities.
- Example: Active project tabs now use `border-primary text-primary bg-primary-light` instead of blue classes.

## 2026-05-17 Sidebar Collapse Must Preserve Navigation

- Symptom: Closing the sidebar hid it completely and moved the reopen control into the header, making navigation feel laggy and less discoverable.
- Root Cause: The sidebar animated to width `0` with opacity changes instead of using a stable collapsed rail.
- Fix: Keep a compact icon rail at 88px, use a spring width transition, and show icon-only menu links with titles while collapsed.
- Prevention Rule: Collapsible primary navigation should retain an always-visible affordance and avoid opacity-plus-width collapse when icons still need to be usable.
- Example: The sidebar now collapses to visible icons and a menu toggle instead of disappearing.

## 2026-05-17 Product Modal Images And Version Snapshots

- Symptom: New product images did not appear in the product popup before submit, image deletion lived in a separate management block, and version history only showed a narrow price/description slice.
- Root Cause: The image input was read only at submit time, while version payloads and database snapshots did not carry the broader product fields being edited.
- Fix: Track selected image files in component state with local previews, move delete controls into the inline thumbnail strip, and expand `ProductVersion` snapshots with core product fields.
- Prevention Rule: Edit modals should preview pending local file selections immediately, and version records should store the same business fields the approval/history UI claims to represent.
- Example: Selecting a new product image now shows a `NEW` thumbnail immediately, and version history can show product name, category, JAN, model, lead time, lot, features, cost, and description.

## 2026-05-17 Product Upload Must Validate Actual Image Content

- Symptom: Product edit could save the text update but fail the follow-up image upload, surfacing as a generic server/upload failure in the catalog UI.
- Root Cause: The upload validator trusted multipart `mimetype` before inspecting the image bytes, so valid browser or tooling uploads with an unexpected content type were rejected.
- Fix: Inspect image metadata with Sharp first, accept JPEG/PNG/WebP by actual decoded format, and keep unsupported/corrupt file errors explicit.
- Prevention Rule: File upload validation should verify the real file content and include a regression test for generic `application/octet-stream` uploads.
- Example: A WebP thumbnail uploaded through `/api/products/:id/images` is normalized to JPEG even if the multipart content type is not one of the image MIME strings.

## 2026-05-17 Product Approval Must Show Real Diffs

- Symptom: Admin approval showed only price/description snapshots even when the submitted change was an image addition, so the admin could not tell what they were approving.
- Root Cause: Approval UI inferred changes from adjacent `ProductVersion` records, while image mutations were applied directly and only audit-logged.
- Fix: Stage product edits in `ProductChangeRequest` with before/after snapshots and image change metadata, then apply text and image changes only after approval.
- Prevention Rule: Any approval workflow must persist a reviewable change set that matches the actual pending action; do not reconstruct approval intent from unrelated history rows.
- Example: Uploading a product image now creates a pending image diff labeled `追加予定`, and deleting one creates `削除予定`; neither changes the official image list until admin approval.

## 2026-05-17 Supplier Visibility Requires Order Readiness

- Symptom: Supplier users could see projects where their products were only candidates, and no notification was created when a product was switched into order handling.
- Root Cause: Supplier project queries were scoped by product ownership instead of actual order requests, and order request creation did not publish a supplier-facing notification.
- Fix: Scope supplier projects/products to `allowOrder`/`OrderRequest`, and create an `ORDER_REQUESTED` notification when a new order request is generated.
- Prevention Rule: External partner visibility should be tied to the explicit workflow handoff, not to internal proposal candidate data.
- Example: A supplier sees a project only after `発注に切り替える` creates a request, and the bell notification links to the order detail.

## 2026-05-17 Document Exports Need Asset Fallbacks And Cached Totals

- Symptom: Proposal PPTX could miss product images, and P/L Excel displayed wrong or stale fields such as delivery classification.
- Root Cause: PPTX generation only read storage-backed `ProductImage` records and ignored catalog `imageUrl` fallbacks; P/L output relied on template formulas and mapped product type instead of delivery method.
- Fix: Add imageUrl/local asset fallback for proposal images, write `売上` values into the proposal comparison slide, and export calculated P/L totals plus `倉庫`/`直送` labels directly.
- Prevention Rule: Generated Office files should contain complete cached values and use the same fallback asset sources as the UI.
- Example: A seeded catalog thumbnail can now appear in PPTX, and P/L rows include `販売単価`, `売上高`, `原価合計`, `粗利`, `粗利率`, and delivery method.

## 2026-05-18 Selection And Date Controls Must Match The Real Workflow

- Symptom: The project product picker lacked the catalog filters, and date fields opened the browser-default English calendar instead of the Japanese green system UI.
- Root Cause: `ProductCatalog` hid its filter toolbar in selection mode, and date picking relied on native `input[type=date]`, whose popup cannot be themed consistently.
- Fix: Show the existing category/supplier/status filters in selection mode and replace native date inputs with a reusable Japanese themed date picker.
- Prevention Rule: Reused list screens must preserve their filtering controls in modal/selection contexts, and any UI that must match the design system should avoid browser-native popups that cannot be styled.
- Example: The project wizard product selector now filters by category and supplier, while dashboard range dates use Japanese labels, green selected dates, and app-styled month navigation.

## 2026-05-18 Approval Image Diffs Need Gallery Treatment

- Symptom: Multiple pending product images were hard to review because the approval UI used small cropped cards and could make it look like only one image was visible.
- Root Cause: The approval screen rendered image diffs like generic cards with `object-cover`, no count, and no enlarged preview even though the API already returned every image diff.
- Fix: Render image diffs as a gallery with an explicit item count, `object-contain` thumbnails, file metadata, and a click-to-zoom preview.
- Prevention Rule: Approval screens for media changes must show every staged file in a review-friendly gallery and preserve image aspect ratio.
- Example: Adding two pending product images now shows two separate `追加予定` cards and each opens a full-size preview.

## 2026-05-18 Dashboard Should Be A Cockpit, Not A Long Report

- Symptom: The dashboard read like a long card list and did not show the whole system state at a glance.
- Root Cause: Metrics, filters, charts, supplier summaries, and project rows were stacked vertically with only one basic chart.
- Fix: Add a viewport-fit BI cockpit dashboard with KPI strip, trend area chart, project funnel, status donut, supplier ranking, category mix, action panel, and compact pipeline.
- Prevention Rule: Executive dashboards should fit the primary story into one viewport and prioritize immediately actionable aggregates over long scrolling detail.
- Example: Admin/Product Manager home now shows sales/profit trend, workflow bottlenecks, pending actions, and current projects without needing to scroll down the page.

## 2026-05-18 Fullscreen Dashboard Panels Must Constrain Children

- Symptom: The dashboard funnel panel overflowed into the lower row, making the BI cockpit look overlapped even though the page itself had `overflow-hidden`.
- Root Cause: The content grid used auto row sizing while the funnel card had fixed tall inner bars, so child content exceeded the available panel height.
- Fix: Define explicit minmax grid rows for the cockpit content, add `min-h-0`/`overflow-hidden` to panels, and compact chart/card internals that live inside fixed-height rows.
- Prevention Rule: Any fullscreen dashboard grid must constrain both parent tracks and child content; never rely on auto rows with fixed-height inner widgets.
- Example: The funnel now uses a shorter bar area inside a two-row dashboard grid, so bottom panels no longer overlap it.

## 2026-05-18 Cockpit Widgets Should Prefer Overflow-Safe Lists

- Symptom: The funnel, action list, and supplier ranking still broke visually in a shorter real dashboard viewport: stage cards clipped labels, the action panel cut rows, and the supplier bar chart showed an oversized gray tooltip/cursor with overflowing labels.
- Root Cause: These widgets used fixed-height mini cards or Recharts axis/tooltip behavior inside very small dashboard panels.
- Fix: Convert the funnel to compact progress rows, make action items a fixed five-row list, and replace the supplier vertical chart with a CSS progress ranking list.
- Prevention Rule: Small cockpit panels should use predictable list/progress layouts instead of nested chart components or fixed-height cards unless their rendered height has been browser-verified.
- Example: Supplier ranking now shows each supplier name, revenue, and a green progress bar without Recharts tooltip overlays or axis label overflow.

## 2026-05-20 Adoption, Availability, And Export Filters Must Share One Workflow

- Symptom: Adopted products, product expiry, dashboard adoption metrics, and export filters were requested together, but the existing code treated adoption as a loose project-product flag and exports as static CSV cards.
- Root Cause: The app had data fields for project-product adoption but no dedicated notification/filter/export surface, and product master records had no proposal availability window.
- Fix: Add product availability dates, block newly selected expired products from proposal creation, add explicit adoption tagging with product code and notifications, replace the dashboard trend with adoption analysis, and convert exports into tabbed filtered CSV/ZIP flows.
- Prevention Rule: Workflow flags that become reporting dimensions need API, UI filters, notifications, and export datasets updated together; otherwise the user sees inconsistent states across screens.
- Example: A 成約 project product can now be marked 採用 with 商品コード, related users get `PRODUCT_ADOPTED`, catalog can filter 採用済み and期限, and データ出力 can export 採用商品 plus optional image ZIP.

## 2026-05-21 Initial Product Images And Export ZIPs Need The Official Asset Path

- Symptom: New product creation showed an empty thumbnail until later refresh/approval, export ZIPs missed original product images, and export date pickers were clipped inside the card.
- Root Cause: The image upload endpoint treated first-time product images as pending approval changes, export ZIP generation only copied storage-backed image records and skipped fallback `imageUrl` assets, and the export tab card clipped child popovers.
- Fix: Allow explicit initial image uploads to create official `ProductImage` records immediately, include both storage objects and local/remote `imageUrl` fallbacks in export ZIP image folders, and let the export panel overflow visible for the themed calendar.
- Prevention Rule: Creation flows should separate official initial assets from later approval-stage edits, and every export path must use the same image source fallback chain as catalog/detail UI.
- Example: Creating a supplier product with `?initial=true` keeps it `ACTIVE` with visible thumbnails, while product CSV ZIP export includes `images/*.jpg` files even for seeded `/assets/...` catalog images.

## 2026-05-21 Brand Marks Should Be Vector Components

- Symptom: The sidebar and login logo looked blurry or awkward because the app reused raster logo files with extra whitespace at very different sizes.
- Root Cause: PNG assets were being stretched into sidebar, collapsed navigation, login, and favicon contexts even though each surface needs a crisp mark with predictable spacing.
- Fix: Replace in-app raster logo usage with reusable SVG/lucide-based `BrandMark` and `BrandLogo` components, and point the favicon to a matching SVG mark.
- Prevention Rule: Core product identity shown across responsive UI shells should be a vector component or SVG asset, not a large whitespace-heavy raster image.
- Example: Sidebar expanded shows a compact green mark plus wordmark, collapsed shows only the SVG mark, login uses a larger wordmark, and `/favicon.svg` uses the same visual language.

## 2026-05-21 Role Permissions Need Scope Checks, Not Just Route Access

- Symptom: Sales users needed to generate/download PPTX and Excel, but simply adding `SALES` to the document route role list would expose documents for projects assigned to other people.
- Root Cause: Document generation routes previously relied on broad role gating and did not validate project ownership for sales users.
- Fix: Allow sales users through the document route only after checking `assignedSalesUserId`, add account self password change and demo forgot-password endpoints, and verify the behavior with regression tests.
- Prevention Rule: Any new permission must define both the capability and the record scope; role checks alone are not enough for user-specific workflows.
- Example: A sales user can list/generate documents for an assigned project, but receives `PROJECT_DOCUMENT_FORBIDDEN` for an unassigned project.

## 2026-05-21 Adoption UI Should Separate Tagging From Ordering

- Symptom: Product code entry and adoption controls were too loose: 商品コード could be edited before a product was actually adopted, and bulk adoption/unadoption was missing from project detail.
- Root Cause: The UI enabled controls based mainly on project status and did not distinguish `isAdopted` tagging from `allowOrder` order conversion clearly enough.
- Fix: Enable 商品コード only when the project is 成約 and the product is 採用済み, add 全部採用/全部不採用 actions, show supplier names in project product rows, and keep 発注に切り替える as a separate order handoff.
- Prevention Rule: Workflow flags that drive reporting, product code, and supplier visibility must have explicit UI states and bulk controls that do not silently trigger downstream order flow.
- Example: A 成約 project can mark all proposal products 採用, then each adopted product's 商品コード field becomes editable with the placeholder `商品コード`; 発注 remains a separate button.

## 2026-05-21 Project Detail Edits Need An Explicit Save Step

- Symptom: Changing status, sales assignment, adoption tags, product codes, or order conversion inside project detail saved immediately, making users unsure which actions were already persisted.
- Root Cause: Detail controls called the same API update handler used by wizard save, so every small UI change became an immediate backend mutation.
- Fix: Add a staged project detail update path that updates the local drawer state, displays `未登録の変更あり`, and only persists when the user clicks `登録`.
- Prevention Rule: Dense manager/detail screens should use explicit save behavior for multi-field workflows; reserve immediate API calls for clearly transactional actions such as order status updates.
- Example: Marking a 成約 product as 不採用 changes the row badge immediately in the drawer, but the backend is updated only after `登録`.

## 2026-05-21 Product Images Must Not Expose Local Storage Hosts

- Symptom: Catalog thumbnails worked on the developer machine but disappeared on another machine when products used uploaded images.
- Root Cause: Product DTOs returned MinIO presigned URLs using `http://localhost:9000`, so remote browsers tried to load their own localhost instead of the app server.
- Fix: Return app-relative file content URLs for product images and stream image bytes through `/api/files/:id/content`.
- Prevention Rule: UI-facing asset URLs must be reachable from the browser's network context; never expose local-only storage endpoints in API responses.
- Example: Uploaded product images now use `/api/files/<fileId>/content`, which works through `https://cjp-demo.online` and local dev alike.

## 2026-05-21 Dashboard Cockpits Need Laptop-First Density Checks

- Symptom: The dashboard looked cramped at normal laptop size with 100% display scaling; small charts and action lists were clipped inside fixed panels.
- Root Cause: The cockpit used the same padding, five KPI cards, a donut-heavy action panel, and rigid grid heights for wide desktop and laptop viewports.
- Fix: Compact header/filter/KPI spacing, convert the action donut into a small bar-summary panel, and tighten dashboard panel radii/gaps so all widgets fit at 1366x768.
- Prevention Rule: Fullscreen dashboard layouts must be visually checked at 1366x768 and keep scroll width/height within the viewport before being marked done.
- Example: The 1366x768 dashboard now keeps all primary panels visible, with `要対応` rows fitting inside the card instead of being cut off.

## 2026-05-21 Public Demo Needs Database And Token Failure Checks

- Symptom: The public domain loaded the frontend but another machine saw `Unexpected server error` during login/session restore.
- Root Cause: The Docker Postgres/MinIO services were not running, and invalid refresh tokens could bubble out as a generic 500.
- Fix: Start the compose services before exposing the tunnel, restart the backend after DB startup, and wrap JWT verification failures as `401 INVALID_TOKEN`.
- Prevention Rule: Public demo startup checks must verify frontend, API health, DB-backed login, and invalid-token behavior rather than only checking `/api/health`.
- Example: `https://cjp-demo.online/api/auth/login` now succeeds with the admin account, while a bad refresh token returns 401 so the frontend can clear stale session state.

## 2026-05-21 EC2 Demo Deploys Need A Repeatable Compose Kit

- Symptom: Moving from a local Cloudflare tunnel demo to AWS would otherwise require many fragile manual steps for Node, Postgres, MinIO, HTTPS, migrations, and seed data.
- Root Cause: The repo only documented local development and had no production compose, reverse proxy, bootstrap, deploy, or backup scripts.
- Fix: Add a single-EC2 Docker Compose kit with Caddy HTTPS, app container, Postgres, MinIO, deploy/bootstrap/backup scripts, and an AWS runbook.
- Prevention Rule: Demo infrastructure should be reproducible from repo files and validate with `docker compose config`, `docker build`, and app health checks before handoff.
- Example: A new Ubuntu EC2 can clone the repo, fill `.env.prod`, run `sh scripts/deploy-prod.sh`, and serve the app at `https://APP_DOMAIN`.

## 2026-05-21 AWS Console Steps Should Have CLI Automation

- Symptom: Creating demo AWS resources manually in the console is easy to misconfigure, especially security groups, key pairs, AMIs, Elastic IPs, and volume sizing.
- Root Cause: The deployment kit automated app runtime but still left cloud resource provisioning as a manual checklist.
- Fix: Add a PowerShell AWS CLI provisioning script that creates/imports the SSH key, security group, Ubuntu EC2 instance, and Elastic IP idempotently.
- Prevention Rule: Any cloud deployment runbook should separate account/DNS actions from scriptable infrastructure and provide an idempotent command-line path for repeatable setup.
- Example: `scripts/aws-provision-ec2.ps1` provisions the single-instance demo baseline and prints the SSH command plus Elastic IP for DNS.

## 2026-05-22 Detail Popovers And Generated Sheets Need Interaction Regression Checks

- Symptom: Notification and account menus could remain open together, dashboard date pickers were covered by charts, order-stage product rows still offered 不採用, and exported P/L sheets only contained static numbers.
- Root Cause: Header popovers were independent booleans without outside-click coordination, chart/card z-indexes were not checked against calendar overlays, order/adoption controls were reused across tabs, and the P/L generator wrote cached totals instead of Excel formulas.
- Fix: Make top-right menus mutually exclusive with outside-click close, raise themed date picker overlays above charts, remove 不採用 from 発注管理 rows, add hover detail to the funnel overview, and write formulas plus workbook recalculation flags into P/L xlsx output.
- Prevention Rule: Stateful detail screens and exports need regression checks for UI interaction layering and post-export editability, not just API success.
- Example: A generated P/L file now keeps cached values for preview but stores `F9=D9*E9`, `F21=SUM(F9:F20)`, and summary cells linked to totals so Excel recalculates after user edits.
