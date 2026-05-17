# Product Multi-Image Upload, Normalization, and Proposal PPTX Image Spec

**Date:** 2026-05-16  
**Status:** Draft for implementation planning  
**Related spec:** `req/system_spec_product_proposal_procurement.md`  
**Related UAT:** `UAT-PRD-011`, `UAT-PROP-002`, `UAT-EXP-003`, `UAT-NFR-004`, `UAT-NFR-006`

---

## 1. Goal

Replace product image URL input with real multi-image upload so suppliers can attach multiple product images when registering or updating their products. The system must normalize oversized or incorrectly sized images, store normalized image assets in S3-compatible storage, and embed product images into generated proposal PowerPoint files.

The feature must make uploaded images reliable for:

- product catalog display,
- product detail/project selection display,
- proposal PPTX export,
- future image batch export.

---

## 2. Constraints

- Follow `rule coding/AGENTS.md`: plan before implementation, minimal impact, validate external input, no hardcoded secrets, update docs/tests before done.
- Keep existing product/project UI mostly intact. Replace URL input with upload controls without broad frontend refactor.
- Do not expose supplier cost, internal P/L, or private file storage object keys in proposal or public-facing outputs.
- Store files through the existing S3-compatible storage abstraction and local MinIO.
- Do not trust client-side file metadata. Backend must validate MIME, extension, size, dimensions, and decoded image content.
- Normalize images server-side before marking them READY.
- Keep original upload optional but not required for MVP. The proposal and UI should use normalized derivatives.
- Support Japanese/Vietnamese filenames, but storage object keys must be normalized and collision-safe.

---

## 3. Roles and Permissions

| Actor | Upload product images | Delete product images | Reorder product images | Use images in proposal |
|---|---:|---:|---:|---:|
| `ADMIN` | Yes | Yes | Yes | Yes |
| `PRODUCT_MANAGER` | Yes | Yes | Yes | Yes |
| `SALES` | No | No | No | Yes |
| `SUPPLIER` | Yes, own products only | Yes, own products only | Yes, own products only | No direct export |

Supplier is the primary image-upload actor. Admin and product manager can manage images for governance/support, but the main business flow is supplier product registration/update. Supplier access must be owner-scoped by `User.supplierId` and `Product.supplierId`.

---

## 4. Functional Requirements

### 4.1 Product Image Upload

- Product create/edit screen must show an image upload area instead of a URL input.
- Supplier users can create products under their own `supplierId`; they cannot choose or spoof another supplier.
- Admin/product manager can create products for any supplier.
- Users can upload multiple images in one action.
- Users can add more images later.
- Users can remove an image before saving and delete an already saved image.
- Users can reorder images by drag/drop or simple up/down controls.
- The first image by `sortOrder` is the primary image.
- Product catalog/list cards should use the primary normalized image.
- Product detail should show all normalized images in order.
- Upload progress and per-file errors must be visible.
- One bad file must not fail the entire batch if other files are valid.

### 4.2 Limits

| Rule | Standard |
|---|---:|
| Max images per product | 10 |
| Max input file size | 15 MB per file |
| Max total upload batch | 60 MB |
| Accepted MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Accepted extensions | `.jpg`, `.jpeg`, `.png`, `.webp` |
| Minimum dimensions | 600 x 600 px recommended; warn if smaller |
| Absolute minimum dimensions | 300 x 300 px |
| Maximum decoded dimensions | 8000 x 8000 px |
| Normalized master size | fit within 1600 x 1600 px |
| Thumbnail size | cover 400 x 400 px |
| Proposal image size | fit within 1280 x 720 px |
| Normalized output format | JPEG for non-transparent images; PNG only if transparency is needed |
| Normalized JPEG quality | 82-88 |

### 4.3 Validation Behavior

Reject with a standard JSON error when:

- file is not an image,
- MIME and decoded content do not match,
- file size exceeds limit,
- dimensions are below absolute minimum,
- dimensions exceed maximum decoded dimensions,
- product does not exist or is soft-deleted,
- user role is not allowed,
- product already has the max number of images.

Warn but allow when:

- dimensions are above absolute minimum but below recommended minimum,
- aspect ratio is unusual but still usable,
- transparent PNG will be flattened for proposal output unless transparency is retained.

### 4.4 Normalization Behavior

For every accepted upload, backend must create normalized derivatives:

1. **Master display image**
   - Fit inside 1600 x 1600 px.
   - Preserve aspect ratio.
   - Strip metadata such as EXIF/GPS.
   - Auto-rotate based on EXIF orientation.
   - Convert CMYK or unusual colorspaces to sRGB.
   - Store as normalized object.

2. **Thumbnail image**
   - Cover 400 x 400 px.
   - Center crop by default.
   - Used for lists/cards.

3. **Proposal image**
   - Fit inside 1280 x 720 px.
   - Preserve aspect ratio.
   - Use white or transparent background depending on source and template needs.
   - Used by PPTX generation.

The original source file may be stored with `purpose=PRODUCT_IMAGE_ORIGINAL` for audit/reprocessing, but the UI and PPTX must use normalized derivatives.

---

## 5. Data Model Requirements

Current schema already has `File` and `ProductImage`. Implementation should extend minimally.

### 5.1 File Metadata

`File` should be able to represent both original and derivative image files.

Required metadata:

- `bucket`
- `objectKey`
- `originalName`
- `mimeType`
- `sizeBytes`
- `checksum`
- `status`
- `ownerType=PRODUCT`
- `ownerId=productId`
- `purpose`
- `uploadedById`
- `createdAt`
- `updatedAt`
- `deletedAt`

Recommended `purpose` values:

- `PRODUCT_IMAGE_ORIGINAL`
- `PRODUCT_IMAGE_MASTER`
- `PRODUCT_IMAGE_THUMBNAIL`
- `PRODUCT_IMAGE_PROPOSAL`

### 5.2 Product Image Grouping

`ProductImage` currently links one product to one file. For derivative support, implementation should add either:

Option A, recommended:

- Add `imageGroupId` to `ProductImage`.
- Add `variant` to indicate `ORIGINAL`, `MASTER`, `THUMBNAIL`, `PROPOSAL`.
- Keep one logical image across multiple derivative files.

Option B, minimal MVP:

- Treat `ProductImage` as the master display image relation.
- Store derivative files with `ownerType=PRODUCT`, `ownerId=productId`, `purpose`, and metadata linking back to master in a JSON metadata field if added later.
- Use object key naming convention to resolve related thumbnail/proposal versions.

Recommended implementation: Option A if schema migration is accepted; Option B only if avoiding schema changes is more important for the next phase.

### 5.3 Image Metadata Fields

Store enough metadata for safe display/export:

- `width`
- `height`
- `format`
- `variant`
- `sortOrder`
- `isPrimary` or derive primary from lowest `sortOrder`
- `normalizedFromFileId`
- `checksum`

If not added as relational fields immediately, metadata can be stored in a future `FileMetadata` JSON column. Do not parse dimensions repeatedly from storage during every list request.

---

## 6. API Requirements

### 6.1 Direct Backend Upload, Recommended for MVP

Use `multipart/form-data` so backend can validate and normalize before storing final assets.

Endpoints:

- `POST /api/products/:id/images`
- `GET /api/products/:id/images`
- `PATCH /api/products/:id/images/order`
- `DELETE /api/products/:id/images/:imageId`

`POST /api/products/:id/images`

- Auth required.
- Roles: `ADMIN`, `PRODUCT_MANAGER`, `SUPPLIER`.
- Supplier users can upload only to products where `product.supplierId` equals `req.user.supplierId`.
- Accepts field name `images`.
- Supports multiple files.
- Returns created image DTOs plus warnings/errors per file.

Response shape:

```json
{
  "images": [
    {
      "id": "product-image-id",
      "productId": "product-id",
      "sortOrder": 0,
      "isPrimary": true,
      "masterUrl": "signed-url",
      "thumbnailUrl": "signed-url",
      "proposalFileId": "file-id",
      "width": 1600,
      "height": 1200,
      "warnings": []
    }
  ],
  "rejected": [
    {
      "fileName": "bad.bmp",
      "code": "UNSUPPORTED_IMAGE_TYPE",
      "message": "Only JPEG, PNG, and WebP images are supported."
    }
  ]
}
```

### 6.2 Presigned Upload, Future Alternative

Presigned upload can be used later for very large files, but it requires a finalize/normalize job:

1. frontend requests presigned upload,
2. frontend uploads original to storage,
3. frontend calls complete,
4. backend validates object and creates derivatives,
5. image becomes READY.

For MVP, direct backend upload is simpler and safer because normalization is immediate.

### 6.3 Product DTO Compatibility

Current frontend type has:

```ts
images: string[];
```

For backward-compatible phase implementation:

- Keep `images` as an array of signed display URLs for existing UI.
- Add richer optional field later:

```ts
imageAssets?: ProductImageAsset[];
```

Where:

```ts
type ProductImageAsset = {
  id: string;
  sortOrder: number;
  masterUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
};
```

---

## 7. Frontend UX Requirements

### 7.1 Product Create/Edit

Replace the URL input with:

- multi-file picker,
- drag/drop area,
- preview grid,
- upload progress,
- per-image validation state,
- reorder controls,
- delete/remove controls,
- primary image indicator.

For supplier users:

- supplier selector is hidden or locked to the logged-in supplier,
- product registration defaults to supplier-owned product submission,
- image upload is available immediately after product creation and during product edit.

### 7.2 Error Copy

Errors must be actionable:

- "File is too large. Maximum size is 15 MB."
- "Image is too small. Minimum size is 300 x 300 px."
- "Only JPG, PNG, and WebP are supported."
- "This product already has 10 images."

### 7.3 Visual Rules

- Use thumbnail previews in cards/lists.
- Do not stretch product images.
- Use object-fit contain for detail/proposal preview.
- Use neutral placeholder when no image exists.

---

## 8. Proposal PPTX Requirements

### 8.1 Image Selection

When generating proposal PPTX:

- Use each product's primary `PRODUCT_IMAGE_PROPOSAL` variant.
- If no proposal variant exists, fall back to master image.
- If no image exists, use a clean placeholder area and do not fail generation.

### 8.2 Placement

PPTX image placement must:

- preserve aspect ratio,
- fit inside the template image box,
- not overlap product name/description/comment,
- use center alignment,
- avoid cropping unless the template explicitly requires crop.

### 8.3 Data Safety

Proposal PPTX must include:

- product image,
- product name,
- product description,
- proposal comment,
- sales/reference price if required by template.

Proposal PPTX must not include:

- supplier cost,
- internal profit,
- P/L summary,
- private storage object keys.

### 8.4 File Reliability

Generated PPTX must open in PowerPoint without repair prompts.

Implementation should add a PPTX package validation smoke test:

- output is a valid zip,
- `[Content_Types].xml` exists,
- slide XML exists,
- embedded image files exist under `ppt/media/`,
- slide relationships reference the embedded images.

---

## 9. Storage and Object Key Standard

Object keys should be deterministic enough to inspect, but not dependent on original user filename only.

Recommended pattern:

```text
products/{productId}/images/{imageGroupId}/{variant}-{timestamp}-{safeBaseName}.{ext}
```

Examples:

```text
products/uuid/images/group-uuid/master-20260516-product-front.jpg
products/uuid/images/group-uuid/thumb-20260516-product-front.jpg
products/uuid/images/group-uuid/proposal-20260516-product-front.jpg
```

Filename rules:

- preserve original name in DB,
- storage key uses sanitized ASCII fallback,
- remove path separators,
- cap length,
- append unique ID/timestamp to avoid collision.

---

## 10. Audit Logging

Write audit logs for:

- `PRODUCT_IMAGE_UPLOAD`
- `PRODUCT_IMAGE_NORMALIZE`
- `PRODUCT_IMAGE_DELETE`
- `PRODUCT_IMAGE_REORDER`
- `DOCUMENT_GENERATE` already exists and should include image count in metadata when proposal images are embedded.

Audit metadata should include:

- `productId`
- `fileId`
- `imageGroupId`
- `variant`
- `width`
- `height`
- `sizeBytes`
- `warnings`

Do not log signed URLs or secrets.

---

## 11. Security and Abuse Protection

- Enforce auth before reading uploaded file streams.
- Limit request body size.
- Limit number of files.
- Validate magic bytes/decoded content, not only MIME header.
- Strip EXIF metadata.
- Reject SVG for this feature to avoid script/security risk.
- Reject animated images for MVP or flatten first frame only with explicit warning.
- Do not serve public object URLs. Return signed URLs from backend.
- Use short-lived signed URLs for private image access.

---

## 12. Implementation Plan

### Goal

Build storage-backed multi-image upload for products and embed normalized product images in generated proposal PPTX.

### Constraints

- Keep existing product/project UI mostly intact.
- Use current S3-compatible storage and `File`/`ProductImage` model.
- Normalize images backend-side.
- Keep proposal export stable and secure.

### Approach

1. Correct product permissions so `SUPPLIER` can create/update/upload images for own products only.
2. Add image processing dependency such as `sharp`.
3. Add backend multipart middleware with strict limits.
4. Add product image upload/list/delete/reorder APIs.
5. Extend Prisma schema for image variants/metadata, or use minimal file-purpose mapping if the phase must avoid broader schema change.
6. Generate normalized proposal-safe image assets and store them through S3 service.
7. Return signed URLs in product DTOs.
8. Replace product URL input with multi-image upload UI.
9. Update proposal PPTX generation to embed product proposal images into slide media.
10. Add tests for supplier ownership, validation, normalization, DTOs, and PPTX image package integrity.
11. Update README/UAT docs.

### Risks

- Image processing can be memory-heavy if limits are weak.
- PPTX embedding is sensitive to OpenXML relationship/content-type correctness.
- Existing template currently has visual placeholders, not stable image tokens. Final implementation should add or document stable image placeholders in the PPTX template.
- Direct backend upload is simpler but less scalable than presigned upload for very large files.

### Verification

- Upload valid JPG/PNG/WebP and confirm normalized derivatives are stored.
- Upload too-large/unsupported/tiny/corrupt files and confirm clear errors.
- Upload multiple files where one fails and confirm valid files still save.
- Reorder images and confirm primary image changes.
- Refresh browser and confirm images persist.
- Generate proposal PPTX and confirm product images appear, with no supplier cost/internal P/L.
- Open generated PPTX in PowerPoint without repair warning.
- Run `npm run db:generate`, `npx prisma validate`, `npm run lint`, `npm test`, `npm run build`.

---

## 13. Acceptance Criteria

- Product image URL input is removed from create/edit UX.
- Product supports up to 10 uploaded images.
- Backend rejects invalid images safely.
- Backend normalizes valid images into display/thumbnail/proposal variants.
- Product list/detail displays normalized images from storage.
- Images persist after browser refresh.
- Proposal PPTX embeds product images from normalized proposal variants.
- Generated proposal files are stored and downloadable through the existing project document flow.
- Tests cover auth, validation, normalization, product DTO, delete/reorder, and PPTX image embedding.

---

## 14. Out of Scope for This Phase

- Full separate supplier portal UI.
- Image annotation/editing/cropping UI.
- Background image processing queue.
- CDN/public image delivery.
- ZIP batch image export.
- AI image quality scoring.
- OCR or automatic JAN extraction from images.
