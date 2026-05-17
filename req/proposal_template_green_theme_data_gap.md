# Product Proposal Green Theme - Data Mapping and Gap Report

**Date:** 2026-05-16  
**Template:** `template/Product_Proposal_Green_Theme.pptx`  
**Slides:** 10  
**Media in template:** 0. Image slots are text placeholders such as `[ 商品画像 ]`, `[ 画像 ]`, and `[ 採用商品画像 ]`.

---

## 1. Executive Summary

The new green proposal template can be supported by the current system, but the current database does not yet store enough structured proposal content for a high-quality output.

Current system already has enough data for:

- project title,
- client name,
- proposal date,
- logged-in 담당 user name,
- product name,
- product JAN code,
- reference/selling price,
- lead time,
- minimum lot,
- supplier-uploaded product images,
- product description,
- per-project proposal comment,
- adopted/recommended product selection,
- adoption date when available.

Current system is missing or too weak for:

- proposal background text,
- structured recommendation points 1-3,
- product model number / 型番 separate from JAN,
- structured feature bullets 1-3 per product,
- structured recommendation reasons 1-3 with reason title and detail,
- formal order date,
- planned delivery date separate from lead time,
- company name / brand visual for closing slide,
- image placement for all new template image slots, especially candidate detail slides 5-7.

---

## 2. Slide-by-Slide Mapping

### Slide 1 - Cover

Template text:

- `PROPOSAL`
- `商品ご提案書`
- `Product Proposal`
- `案件名`
- `ご提案先`
- `提案日`
- `担当`

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| 案件名 | `Project.title` | Available | `Project.title` |
| ご提案先 | `Project.client.name` | Available | `Client.name` |
| 提案日 | generation date | Available | `new Date()` or future `ProposalDocument.generatedAt` |
| 担当 | logged-in user name | Available | JWT actor `User.name` |

No DB change required for MVP.

### Slide 2 - Proposal Overview

Template text:

- `ご提案概要`
- `■ ご提案の背景`
- `背景情報をここに記載してください`
- `■ おすすめポイント`
- `ポイント１を記載`
- `ポイント２を記載`
- `ポイント３を記載`
- `■ 推奨商品`
- `RECOMMENDED`

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| 提案の背景 | currently generated from project/client text only | Missing as structured data | Add `Project.proposalBackground String?` |
| おすすめポイント 1-3 | can infer from `ProjectProduct.proposalComment`, but not structured | Missing | Add `Project.recommendationPoints Json?` or a `ProjectRecommendationPoint` table |
| 推奨商品 | adopted product or first selected product | Available | `ProjectProduct.isAdopted=true`, fallback first product |

Recommended MVP schema:

- `Project.proposalBackground String?`
- `Project.recommendationPoints Json?`

Recommended UI location:

- Project create/edit wizard, step 3 "条件確定" or a new "提案内容" section.

### Slide 3 - Product Details

Template text:

- `[ 商品画像 ]`
- `推奨商品`
- `商品情報`
- `商品名`
- `型番`
- `参考価格`
- `納期`
- `最小ロット`
- `■ 特徴`
- feature bullet 1-3

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| 商品画像 | supplier-uploaded `ProductImage` | Available after image upload implementation | primary product image |
| 商品名 | `Product.name` | Available | `Product.name` |
| 型番 | currently using `Product.janCode` as fallback | Missing as correct business field | Add `Product.modelNumber String?` |
| JAN | `Product.janCode` | Available but not same as 型番 | Keep separate |
| 参考価格 | `ProjectProduct.sellingPrice` or `Product.listPrice` | Available | project price first, product list price fallback |
| 納期 | `Product.leadTime` | Available | `Product.leadTime` |
| 最小ロット | `Product.minLot` | Available | `Product.minLot` |
| 特徴 1-3 | `Product.description` only | Missing as structured bullets | Add `Product.features Json?` or `ProductFeature` table |

Recommended MVP schema:

- `Product.modelNumber String?`
- `Product.features Json?`

Recommended UI location:

- Product create/edit form used by supplier.
- Replace single description-only usage with:
  - description,
  - feature bullet 1,
  - feature bullet 2,
  - feature bullet 3,
  - optional remarks.

### Slide 4 - Candidate Product Comparison

Template text:

- `候補商品比較`
- three product image slots,
- recommended/candidate labels,
- product names,
- prices,
- comments,
- price/feature rows.

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| Product 1-3 images | `ProductImage` | Available | first image for each selected product |
| 推奨 / 候補 label | `ProjectProduct.isAdopted` | Available | adopted product = 推奨 |
| 商品名 | `Product.name` | Available | `Product.name` |
| 価格 | `ProjectProduct.sellingPrice` | Available | `ProjectProduct.sellingPrice` |
| コメント | `ProjectProduct.proposalComment` | Available | `ProjectProduct.proposalComment` |
| 特徴 | `Product.description` fallback | Weak | `Product.features[0..2]` after schema addition |

Recommended rule:

- Output first 3 project products by project order.
- If one product is adopted, mark it as `推奨`; others as `候補`.
- If no adopted product exists, mark first product as `推奨候補`.

### Slides 5-7 - Candidate Product Image Gallery

Template text:

- Slide 5: `候補商品 - 商品名 ①`, six `[ 画像 ]` slots
- Slide 6: `候補商品 - 商品名②`, six `[ 画像 ]` slots
- Slide 7: `候補商品 - 商品名③`, six `[ 画像 ]` slots

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| candidate product title | `Product.name` | Available | selected project product |
| 6 images per candidate | `ProductImage[]` up to 10 | Available after image upload implementation | first 6 images by `sortOrder` |

Implementation gap:

- Current PPTX generator embeds only limited images for the older template.
- It must be updated to detect the new green template and insert images into slides 5-7 as galleries.

Recommended rule:

- Slide 5 uses selected product 1 images.
- Slide 6 uses selected product 2 images.
- Slide 7 uses selected product 3 images.
- If fewer than 6 images exist, leave remaining image slots blank or remove placeholder text.

### Slide 8 - Recommendation

Template text:

- `[ 採用商品画像 ]`
- `採用推奨商品`
- `■ 推奨理由`
- reason title/detail 1
- reason title/detail 2
- reason title/detail 3

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| 採用商品画像 | adopted product primary image | Available | `ProjectProduct.isAdopted=true` product image |
| 採用推奨商品 | adopted product name | Available | `Product.name` |
| 推奨理由 title/detail 1-3 | `ProjectProduct.proposalComment` only | Missing as structured reasons | Add `ProjectProduct.recommendationReasons Json?` |

Recommended MVP schema:

- `ProjectProduct.recommendationReasons Json?`

Example JSON:

```json
[
  { "title": "品質", "detail": "高品質で顧客満足度が高い商品です。" },
  { "title": "納期", "detail": "短納期でキャンペーン日程に合わせやすいです。" },
  { "title": "価格", "detail": "参考価格と利益率のバランスが良好です。" }
]
```

Recommended UI location:

- Project product condition editor, near proposal comment and selling price.

### Slide 9 - Schedule

Template text:

- `提案日`
- `採用決定`
- `発注`
- `納品`
- `備考`

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| 提案日 | generation date or project created date | Available | generation date |
| 採用決定 | `ProjectProduct.adoptionDate` | Available when adopted | adopted project product |
| 発注 | not formalized for project product | Missing / partial | Add `ProjectProduct.orderPlannedDate DateTime?` or use first `OrderRequest.createdAt` after full order workflow |
| 納品 | `OrderRequest.deliveryDate` or `Product.leadTime` | Partial | `OrderRequest.deliveryDate`, fallback lead time text |
| 備考 | `Project.remarks` missing | Missing | Add `Project.remarks String?` |

Recommended MVP schema:

- `Project.remarks String?`
- `ProjectProduct.orderPlannedDate DateTime?`

If order workflow is not implemented yet, use lead time as a fallback and show `未定` for formal order date.

### Slide 10 - Closing

Template text:

- `THANK YOU`
- `Company Name`
- `Brand Visual`

Mapping:

| Template field | Current data | Status | Recommended source |
|---|---|---|---|
| Company Name | no company settings table | Missing | Add app/company setting |
| Brand Visual | no brand logo/visual file | Missing | Add company logo/brand file setting |

Recommended MVP schema:

- Add `AppSetting` table or environment-backed config for company display name.
- Store brand visual/logo in `File` with `ownerType=USER` or a future `SYSTEM` owner type.

Minimal MVP alternative:

- Use env vars:
  - `COMPANY_DISPLAY_NAME`
  - `COMPANY_LOGO_FILE_ID` or `COMPANY_LOGO_OBJECT_KEY`

DB-backed settings are better for admin UI later.

---

## 3. Recommended Data Model Additions

### Product

Add:

- `modelNumber String?`
- `features Json?`

Reason:

- The template distinguishes 型番 from JAN.
- Product features need 3 reusable bullet points for slide 3, slide 4, and proposal text.

### Project

Add:

- `proposalBackground String?`
- `recommendationPoints Json?`
- `remarks String?`

Reason:

- Slide 2 and slide 9 need project-level proposal narrative.

### ProjectProduct

Add:

- `recommendationReasons Json?`
- `orderPlannedDate DateTime?`
- optional `displayOrder Int @default(0)`

Reason:

- Slide 8 needs structured recommendation reason titles/details.
- Slide 9 needs order schedule.
- Slides 4-7 need stable candidate order.

### ProductImage / File

Current implementation supports multiple supplier-uploaded product images. For this green template:

- Use first image as primary image for slide 3, slide 4, and slide 8.
- Use first 6 images for slides 5-7 gallery pages.

Future improvement:

- Add image variant metadata for `MASTER`, `THUMBNAIL`, `PROPOSAL`.

### App Settings

Add later:

- `companyDisplayName`
- `companyLogoFileId`
- `brandVisualFileId`

Reason:

- Slide 10 closing branding.

---

## 4. Generator Changes Needed

The current generator is tuned for the previous Japanese proposal template. For this new template:

1. Add template selector/config:
   - old template path,
   - `Product_Proposal_Green_Theme.pptx` path.
2. Add stable placeholder tokens to the PPTX if possible.
   - Current template uses visible Japanese placeholder text.
   - Recommended tokens: `{{PROJECT_TITLE}}`, `{{CLIENT_NAME}}`, `{{PRODUCT_1_NAME}}`, etc.
3. Replace slide text by token/placeholder map.
4. Embed images:
   - slide 3: recommended product primary image,
   - slide 4: first 3 candidate primary images,
   - slides 5-7: up to 6 images per candidate,
   - slide 8: adopted/recommended product primary image,
   - slide 10: brand visual if configured.
5. Preserve aspect ratio and fit images into their placeholder boxes.
6. Validate generated PPTX:
   - zip opens,
   - `[Content_Types].xml` includes image content types,
   - `ppt/media/*` includes embedded images,
   - slide relationships reference media.

---

## 5. Implementation Priority

### Phase A - Required for green template MVP

1. Add product fields:
   - `modelNumber`
   - `features`
2. Add project fields:
   - `proposalBackground`
   - `recommendationPoints`
   - `remarks`
3. Add project product fields:
   - `recommendationReasons`
   - `displayOrder`
4. Update supplier product form to collect model number and feature bullets.
5. Update project flow to collect proposal background, points, and recommendation reasons.
6. Update PPTX generator for `Product_Proposal_Green_Theme.pptx`.

### Phase B - Nice to have

1. Add company settings for slide 10.
2. Add formal order planned date after full order workflow is implemented.
3. Add tokenized PPTX template instead of text-search replacement.
4. Add admin UI to manage template selection and brand assets.

---

## 6. Current Workarounds If Implemented Before Schema Changes

If generating from current data only:

- 型番 = JAN code.
- Proposal background = generated sentence from project/client.
- Recommendation points = first 3 product comments/descriptions.
- Feature bullets = split product description or use remarks.
- Recommendation reasons = project product proposal comment repeated into reason 1.
- Order date = `未定`.
- Delivery date = first order request delivery date, fallback product lead time.
- Company name = env or static fallback.

These workarounds are acceptable only for demo output, not final UAT-ready proposal generation.

---

## 7. Implementation Status

**Updated:** 2026-05-16

Phase A is implemented for the green proposal template MVP:

- Product gap fields are stored and exposed: `modelNumber`, `features`.
- Project gap fields are stored and exposed: `proposalBackground`, `recommendationPoints`, `remarks`.
- Project-product gap fields are stored and exposed: `recommendationReasons`, `displayOrder`, `orderPlannedDate`.
- Supplier/product UI collects model number, feature bullets, and multi-image uploads.
- Project UI collects proposal background, recommendation points, per-product recommendation reasons, remarks, and planned order date.
- Proposal PPTX generation uses `template/Product_Proposal_Green_Theme.pptx` and maps slides 1-10.
- Product images are embedded into slide 3, slide 4, slide 8, and candidate gallery slides 5-7.
- Visible image placeholders such as `[ 商品画像 ]`, `[ 画像 ]`, and `[ 採用商品画像 ]` are cleared during generation.
- Regression coverage verifies green-template text mapping, image media insertion, gallery slide image insertion, JPG content types, and placeholder cleanup.

Remaining Phase B items:

- DB-backed company settings and brand/logo asset management for slide 10.
- Tokenized PPTX placeholders to replace visible text-search mapping.
- Admin UI for template selection and brand assets.

---

## 8. PPTX Layout Safety Rules

The green template generator must preserve the authored template layout instead of allowing mapped data to change object geometry.

Text mapping rules:

- Never replace a fixed label such as `商品名`, `型番`, `提案日`, or `採用決定` with `label + newline + value`.
- Put dynamic values into the template value slot, such as the matching `________________` placeholder.
- Normalize mapped text before insertion:
  - collapse newlines and repeated whitespace for one-line slots,
  - cap long values per slot and add an ellipsis when needed,
  - only allow controlled wrapping in product title slots where the template has enough height.
- Keep labels in their original text boxes so the template's x/y position and font styling remain stable.

Image mapping rules:

- Do not stretch images with a mismatched aspect ratio.
- Crop each source image to the configured template box aspect ratio with cover behavior.
- Export the cropped image as a JPEG sized for the target box, then place it exactly at the box x/y/cx/cy.
- Prefer visual center/attention cropping over leaving empty margins or letting the image spill outside the frame.
- Keep the generated picture inside the visual frame reserved by the template, especially before product title text on comparison slides.

Reference layout:

- Use `D:\Download\2026-05-16T15-56-51-199Z.pptx` as the accepted hand-tuned layout reference for the green proposal export.
- Cover slide values are separate generated value text boxes; labels remain in the template label boxes.
- Slide 4 comparison prices and quantities are generated as separate fixed-position text boxes so long titles/comments cannot push them out of alignment.
- Slide 3 detail, slide 4 comparison, slide 8 recommendation, and slides 5-7 gallery images use fixed boxes copied from the reference layout.
