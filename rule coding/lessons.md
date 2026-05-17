# tasks/lessons.md

*Last updated: 2026-02-28*

# AI-Agent Lessons Learned

Each entry must follow this structure:

------------------------------------------------------------------------

## Lesson Title

**Date:** YYYY-MM-DD

### Symptom

What went wrong?

### Root Cause

Why did it happen?

### Fix

What was changed?

### Prevention Rule

What rule should prevent this next time?

### Example

Code or scenario demonstrating correct approach.

------------------------------------------------------------------------

# Continuous Improvement Notes

-   Review relevant lessons before starting related tasks.
-   Update lessons immediately after corrections or postmortems.

------------------------------------------------------------------------

## Prisma 7 Migrate Diff Uses Schema Flags

**Date:** 2026-05-14

### Symptom

Generating an initial migration SQL with `prisma migrate diff --to-schema-datamodel` failed because the flag no longer exists.

### Root Cause

Prisma 7 removed the older `--from/to-schema-datamodel` flags and replaced them with `--from/to-schema`.

### Fix

Use `prisma migrate diff --from-empty --to-schema server/prisma/schema.prisma --script`.

### Prevention Rule

For Prisma 7 migration diff commands, use `--from-schema` and `--to-schema`, not the removed datamodel flag names.

### Example

```bash
npx prisma migrate diff --from-empty --to-schema server/prisma/schema.prisma --script
```

------------------------------------------------------------------------

## Partial Migration Broke World Inspector Runtime

## Vite And Vitest Config Types Diverged

**Date:** 2026-03-13

### Symptom

TypeScript build failed after adding `vitest/config` to a Vite config that also used the React Vite plugin.

### Root Cause

The config mixed Vite plugin types from different bundled Vite versions, which produced incompatible plugin signatures during `tsc`.

### Fix

Use `defineConfig` from `vite` for the main app config and keep test setup minimal unless Vitest-specific config is actually required.

### Prevention Rule

Do not switch the primary frontend config to `vitest/config` unless the project really needs Vitest-only options there and the package versions are aligned.

### Example

Prefer:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

## Eager Settings Construction Broke Unrelated Environments

**Date:** 2026-03-13

### Symptom

Backend test import failed before any test ran because an unrelated environment variable was invalid for a config class that was not supposed to be used.

### Root Cause

`get_config()` instantiated every config variant eagerly, so validation ran for unused settings models during module import.

### Fix

Return only the selected settings class instance based on `ENV` and avoid constructing other variants.

### Prevention Rule

When selecting environment-specific settings, instantiate only the chosen configuration object. Do not validate unused environment profiles at import time.

### Example

Prefer:

```py
def get_config():
    if os.getenv("ENV") == "local":
        return LocalConfig()
    if os.getenv("ENV") == "production":
        return ProductionConfig()
    return Config()
```

## FastAPI TestClient Needs A Compatible Httpx Version

**Date:** 2026-03-13

### Symptom

Backend tests crashed while creating `TestClient` with `Client.__init__() got an unexpected keyword argument 'app'`.

### Root Cause

The backend pinned `fastapi/starlette` versions that still expect the older `httpx` test client API, but `httpx==0.28.1` removed that compatibility path.

### Fix

Pin `httpx==0.27.2` in backend dependencies so `TestClient` matches the installed FastAPI/Starlette versions.

### Prevention Rule

When a project uses `fastapi.testclient.TestClient`, keep `httpx` pinned to a version known to be compatible with the repo's `fastapi` and `starlette` pins.

### Example

Prefer a compatible set such as:

```txt
fastapi==0.104.1
httpx==0.27.2
```

## Load The Right Env File For The Active Mode

**Date:** 2026-03-14

### Symptom

Setting `ENV=local` still made the backend use production-style values from `.env`, including the PostgreSQL URL.

### Root Cause

`load_dotenv()` loaded `.env` unconditionally before settings selection, so process environment values from `.env` overrode `.env.local`.

### Fix

Load only the env file that matches the active mode, instead of loading `.env` globally first.

### Prevention Rule

When a project supports multiple env files, do not preload a generic `.env` ahead of settings resolution. Select the env file based on the active mode first.

### Example

Prefer:

```py
_env_file = ".env.local" if os.getenv("ENV") == "local" else ".env"
load_dotenv(project_root / _env_file, override=False)
```

## Windows Console Can Crash On Emoji Logs

**Date:** 2026-03-14

### Symptom

Backend startup crashed on Windows with `UnicodeEncodeError` while printing status logs during startup.

### Root Cause

The console encoding was `cp1252`, which could not encode emoji characters used in startup messages.

### Fix

Replace emoji-based startup prints with ASCII-safe log text.

### Prevention Rule

Keep startup and CLI logs ASCII-safe unless the runtime console encoding is explicitly controlled.

### Example

Prefer:

```py
print("[OK] Ticket processing consumer started successfully")
```

## Local Mode Should Not Hard-Fail On Optional Infra

**Date:** 2026-03-14

## OCR Review Overlays Need The Same Coordinate Space As The Preview

**Date:** 2026-04-08

### Symptom

Adding bounding boxes to ticket OCR looked straightforward, but the existing preview was the raw uploaded image while OCR boxes were produced on the aligned ticket canvas.

### Root Cause

The OCR pipeline only returned structured text fields. It did not expose an aligned preview image or merged field bounding boxes, so the frontend had no reliable coordinate system for overlays.

### Fix

Return `preview_base64` and `detected_boxes` from the AI ticket controller, then render overlays against the aligned preview in the web app.

### Prevention Rule

Whenever an OCR review screen needs overlays, confirm the preview image and the box coordinates share the same transform before wiring the UI.

### Example

Prefer returning payloads like:

```json
{
  "preview_base64": "<aligned-jpeg-base64>",
  "detected_boxes": [
    { "field": "Receiver", "bbox": [120, 88, 640, 164], "text": "世田谷四郵便局" }
  ]
}
```

### Symptom

Local OCR upload failed immediately because MinIO was not running, even though the rest of the local stack could still work.

### Root Cause

The storage layer assumed MinIO was always available and raised a connection error before the OCR job could be created.

### Fix

Use MinIO when available, but fall back to filesystem storage in local mode so uploads still work without object storage.

### Prevention Rule

For local development, treat infra like object storage as optional unless the feature strictly requires parity with production.

### Example

Prefer:

```py
try:
    return MinIOService()
except Exception:
    if os.getenv("ENV") == "local":
        return LocalStorageService()
    raise
```

## Prefer Python Module Entrypoints In Containers

**Date:** 2026-03-14

### Symptom

The backend Docker container restarted immediately with `exec /usr/local/bin/uvicorn: exec format error`.

### Root Cause

The generated `uvicorn` CLI script inside the image was present but unusable, so starting the app through the wrapper binary failed before FastAPI booted.

### Fix

Start the server with `python -m uvicorn` and use a Python-based healthcheck instead of shell-specific tooling.

### Prevention Rule

For Python containers, prefer module entrypoints and healthchecks that rely on Python itself rather than wrapper scripts or optional shell tools.

### Example

Prefer:

```dockerfile
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9999"]
```

## Clear Stale Network Errors After Recovery

**Date:** 2026-03-14

### Symptom

The web app could keep showing `Failed to fetch` even after later polling or status requests succeeded.

### Root Cause

Transient request failures set the page error state, but successful retries did not clear that stale error message.

### Fix

Clear the page error state whenever upload, polling, or history reload succeeds.

### Prevention Rule

For polling UIs, treat successful retries as recovery events and explicitly clear any network error banners.

### Example

Prefer:

```ts
const nextStatus = await ticketApi.getStatus(ticketId, session)
setErrorMessage(null)
setTicketStatus(nextStatus)
```

## Isolate Worker Pipeline Failures And Fail Jobs Explicitly

**Date:** 2026-03-14

### Symptom

Ticket OCR requests looked like CORS or polling failures in the browser, while jobs stayed stuck in `processing` or showed generic `Failed to fetch`.

### Root Cause

The Celery worker initialized stamp and ticket pipelines together. When one pipeline crashed during startup, the other pipeline never became usable. Validation failures were then published without moving the ticket job out of `processing`, and fresh tickets with `quality_status = NULL` could still trigger brittle status responses.

### Fix

Initialize worker pipelines independently, include validation error messages in the RabbitMQ payload, default missing `quality_status` to `unknown`, and mark ticket jobs as `failed` whenever validation fails or crashes.

### Prevention Rule

In async processing systems, do not let one model or pipeline initialization failure block unrelated job types. Any validation terminal state must also transition the job to a terminal status.

### Example

Prefer:

```py
try:
    _init_stamp_pipeline()
except Exception as exc:
    stamp_pipeline = None
    print(f"[WARN] StampPipeline initialization failed: {exc}")

if status_code != 200 or not is_valid:
    repository.update_ticket_status(
        ticket_id,
        ProcessingStatus.FAILED,
        error_message=error_message or "Ticket image did not pass validation",
    )
```

## Make ONNX Execution Providers Explicit In Docker

**Date:** 2026-03-14

### Symptom

Ticket OCR kept failing in Docker even though the uploaded image was valid and the OCR models could run when tested individually.

### Root Cause

The AI container used `onnxruntime-gpu`, but the local Docker environment had no usable NVIDIA driver. Several models were hardcoded to prefer `CUDAExecutionProvider`, and one recognition model failed during runtime unless the session was forced to CPU.

### Fix

Add a shared ONNX provider selector, make provider order configurable via environment variable, and set local Docker to `ONNX_EXECUTION_PROVIDERS=CPUExecutionProvider`.

### Prevention Rule

Do not hardcode GPU-first ONNX providers in Docker stacks that may run without a working GPU runtime. Make execution providers explicit and environment-driven.

### Example

Prefer:

```py
providers = get_onnx_execution_providers()
session = ort.InferenceSession(model_path, providers=providers)
```

## Operator Workspaces Should Hide Secondary Actions

**Date:** 2026-03-14

### Symptom

The OCR web app exposed too many secondary actions at once, including draft storage, export, delete, and utility buttons, which made the main review flow harder to scan.

### Root Cause

The initial web migration preserved many utility controls from a builder-focused implementation instead of optimizing for the operator's primary task: upload, validate, correct, and save.

### Fix

Redesign the ticket and stamp pages as split-view workspaces, keep the document and extracted fields visible together, and remove non-essential actions from the main user path.

### Prevention Rule

For operator-facing tools, prioritize one primary workflow per screen. Secondary actions should be removed or de-emphasized unless they are required for task completion.

### Example

Prefer:

```tsx
<div className="workspace-grid workspace-grid--split">
  <SourceDocumentPane />
  <ReviewPane primaryAction="Save to backend" />
</div>
```

## Compact Layout Requires Spacing Cuts, Not Just Content Cuts

**Date:** 2026-03-14

### Symptom

Even after removing extra buttons and history panels, the OCR workspace still felt oversized because the header, sidebar, and content blocks kept their original padding and spacing.

### Root Cause

The layout logic was simplified first, but the original CSS scale remained tuned for a broader dashboard-style experience rather than a focused operator tool.

### Fix

Reduce shell padding, compress the header into a single row, tighten sidebar navigation, and add dedicated compact workspace styles for upload, preview, and output panes.

### Prevention Rule

When simplifying an operator workflow, reduce both content complexity and layout spacing. Removing controls without shrinking the surrounding visual chrome leaves the UI feeling heavier than it is.

### Example

Prefer:

```css
.topbar {
  align-items: center;
  padding: 14px 18px;
}

.compact-workspace {
  grid-template-columns: minmax(300px, 0.78fr) minmax(0, 1.22fr);
  gap: 18px;
}
```

## OCR Review Areas Need A Parent Frame And Child Panels

**Date:** 2026-03-14

### Symptom

Even with a simplified workflow, operators still had to visually parse where the image area ended and where extracted data began because preview and output looked like separate page blocks rather than one review unit.

### Root Cause

The UI reduced actions, but the preview pane and extracted fields were not grouped under a shared visual boundary, so the relationship between them stayed weak.

### Fix

Wrap preview and extracted output inside one framed review container, then split the inside into smaller dedicated panels for the image and for the editable OCR result. Reduce textarea height for long address fields to keep the review unit compact.

### Prevention Rule

For OCR review screens, the source document and extracted output should read as one task block first, then as two sub-blocks inside it. Use a parent frame to bind them visually before styling the child sections.

### Example

Prefer:

```tsx
<div className="compact-review-frame">
  <div className="compact-subpanel">{/* image */}</div>
  <div className="compact-subpanel">{/* output */}</div>
</div>
```

## Default Locale Changes Must Cover Labels, Statuses, And Field Order Together

**Date:** 2026-03-14

### Symptom

After the OCR workspace was streamlined, the UI still felt inconsistent because visible labels stayed in English, status badges did not match the target locale, and the extracted field order no longer matched the operator's preferred review sequence.

### Root Cause

Localization was treated as a text replacement task instead of a full operator-facing presentation change. Field sequencing and shared status labels were left in the previous default state.

### Fix

Translate the shell, auth flow, dashboard, ticket workspace, stamp workspace, and shared status badge to Japanese by default, and reorder ticket fields to `郵便番号 -> 住所 -> 氏名 -> 電話番号` for both `TO` and `FROM`.

### Prevention Rule

When switching the default language of an operator tool, update shared components and workflow field order in the same pass. Locale consistency is not complete if statuses, helper text, and review sequencing remain in the old default.

### Example

Prefer:

```tsx
<label className="field">
  <span>郵便番号</span>
  <input className="input" />
</label>
<label className="field">
  <span>住所</span>
  <textarea className="textarea textarea--compact" />
</label>
```

## Low-Data Form Features Work Better With Expanded Warps Than New Full-Image Detectors

**Date:** 2026-03-14

### Symptom

We needed to add `配達希望時間帯` detection for a Yu-Pack demo, but only had 17 labeled images. The current ticket aligner normalized the left form block only, so the target mark area on the right side was not even visible in the aligned output.

### Root Cause

Treating the problem as "train another detector on the raw image" would have forced a full-image small-object detection problem onto a dataset that was far too small. The existing homography already contained enough geometric information, but the pipeline stopped at a narrow crop that excluded the delivery-time row.

### Fix

Reuse the corner points from the ticket alignment step, generate a wider warp canvas that keeps the right-side panel, crop the fixed `配達希望時間帯` ROI from that normalized view, then train a lightweight per-row classifier for the demo. Store the image-to-label mapping in a CSV manifest so the dataset stays explicit and reproducible.

### Prevention Rule

When a new form feature sits on a fixed template and the dataset is tiny, first ask whether the current alignment metadata can expose that region in normalized space. Expanding the warp and classifying a fixed ROI is usually more stable and cheaper than adding a new detector over the raw document.

### Example

Prefer:

```python
wide_warp = warp_delivery_time_canvas(image, corner_points, width_scale=2.0)
roi = crop_normalized(wide_warp, DELIVERY_TIME_TEMPLATE_ROI["template2"])
prediction = delivery_time_detector.predict(roi)
```

## Upload Areas Need Explicit Dropzone Affordances, Not Just Hidden File Inputs

**Date:** 2026-03-14

### Symptom

The OCR workspace technically allowed file selection, but the upload area still looked like a plain filled box, so users could not immediately tell that the area also supported drag-and-drop.

### Root Cause

The input relied on a hidden native file control without enough visual cues. There was no icon, no explicit drag-and-drop copy, and no hover or drag-over state to signal the interaction model.

### Fix

Replace the plain upload label with a shared dropzone component that adds an upload icon, dashed border, click-to-select copy, and drag-over styling. Reuse the same component in both ticket and stamp screens so the affordance stays consistent.

### Prevention Rule

If a screen supports drag-and-drop uploads, the UI should advertise that capability directly. Use a visible dropzone with iconography, dashed borders, and clear helper text instead of relying on an invisible file input alone.

### Example

Prefer:

```tsx
<UploadDropzone
  emptyLabel="伝票画像を選択"
  hint="クリックまたはここへドラッグ＆ドロップ"
  onFileSelect={setSelectedFile}
  selectedFile={selectedFile}
/>
```

## Demo Classifiers Break Fast If The Label Space Is Incomplete

**Date:** 2026-03-14

### Symptom

`配達希望時間帯` looked correct on the first demo set but failed on the next batch of test images. Several marked options came back blank in the UI even though the circles were clearly visible.

### Root Cause

The demo classifier was trained on too few examples for the right-side slots, and the label space itself was incomplete because `希望しない` was not modeled as a valid class. The pipeline therefore treated some real selections as if no slot had been chosen.

### Fix

Add the missing `no_preference` class, extend the manifest so both training and validated test images can be included explicitly, then retrain the lightweight classifier on the combined labeled set. Keep image paths in the manifest instead of assuming everything lives in one folder.

### Prevention Rule

For fixed-form option detectors, validate the full option list against the paper form before training. If one printed choice is missing from the class list, the model will silently convert that user action into a false blank result.

### Example

Prefer:

```csv
filename,image_path,selected_slot
IMG_3755.JPEG,Test data/IMG_3755.JPEG,no_preference
IMG_3756.JPEG,Test data/IMG_3756.JPEG,19_21
```

## Demo Vision Models Need New Variants Added To The Manifest As Soon As They Appear

**Date:** 2026-03-14

### Symptom

`配達希望時間帯` worked for the first corrected batch, then failed again on two newly marked copies even though the circles were visually obvious.

### Root Cause

The detector was still a tiny demo classifier. The new blue-mark variants for `19時〜21時` and `20時〜21時` were outside the narrow set of examples used in the last retrain, so the model fell back to `none`.

### Fix

Add the newly validated images to the manifest immediately, retrain the lightweight classifier, and verify the exact files again through both local inference and the backend API.

### Prevention Rule

For low-data document features, treat each new marking style as real training signal. When a failure is confirmed, promote that image into the labeled manifest instead of hoping the previous tiny model will generalize.

### Example

Prefer:

```csv
IMG_3737-copy mark.JPEG,Test data/IMG_3737-copy mark.JPEG,20_21
IMG_37371-copy mark.JPEG,Test data/IMG_37371-copy mark.JPEG,19_21
```

## Fixed-Template Mark Detection Improves Faster With Row-Level Synthetic Data Than With More Patch Noise Alone

**Date:** 2026-03-14

### Symptom

Even after adding a few new labeled failures, `配達希望時間帯` still broke on fresh marked variants because the tiny classifier had only seen a narrow set of row appearances.

### Root Cause

The training pipeline only augmented individual slot patches lightly. That helped local texture robustness a bit, but it did not create enough variation in the full row geometry, compression artifacts, and print-to-mark relationships seen in real camera captures.

### Fix

Generate synthetic row crops from validated labeled images, keep their labels in a dedicated manifest, and let the trainer consume both original full images and synthetic `row_crop` samples. This expands the demo dataset by a few hundred labeled examples without inventing new class semantics.

### Prevention Rule

For fixed-form option detection, prefer augmenting the whole normalized row when the mark sits inside a repeated template structure. Row-level synthetic samples preserve slot context better than patch-only noise.

### Example

Prefer:

```csv
filename,image_path,selected_slot,sample_type
IMG_3755-mark__synthetic_03.jpg,generated_rows/IMG_3755-mark__synthetic_03.jpg,16_18,row_crop
```

## OCR Review Previews Should Default To Full-Image Fit Before Adding Zoom Controls

**Date:** 2026-03-14

### Symptom

Operators could not reliably verify extracted fields because the preview area cropped the document and offered no way to inspect small handwriting or marks in detail.

### Root Cause

The preview used a static `cover` image treatment meant for presentation rather than review. That hid parts of the source image and gave no interaction model for close inspection.

### Fix

Switch the preview to a dedicated image viewer that fits the whole image by default, then add explicit `zoom in`, `zoom out`, `reset`, and drag-to-pan behavior for review work.

### Prevention Rule

For OCR validation workflows, treat image previews as operator tools, not decorative thumbnails. The default state should preserve the full document, and fine inspection should be one interaction away.

### Example

Prefer:

```tsx
<ImageViewer
  alt="選択した伝票画像"
  emptyLabel="伝票画像のプレビュー"
  src={previewUrl}
/>
```

## Cloudflared Can Create A Tunnel Successfully While Still Being Bound To The Wrong DNS Zone

**Date:** 2026-03-14

### Symptom

`cloudflared tunnel create` worked and a new tunnel was created locally, but `cloudflared tunnel route dns` produced hostnames under an unrelated zone instead of the target domain.

### Root Cause

The local `cloudflared` login was authenticated against a different Cloudflare-managed zone. The target domain was still using external nameservers, so Cloudflare could not create DNS records for that domain even though the tunnel itself was valid.

### Fix

Create the tunnel and config locally, but verify the target domain's nameservers before attempting final DNS routing. Keep tunnel config separate from the machine's existing config so unrelated zones are not overwritten.

### Prevention Rule

Before wiring a fixed domain to a Cloudflare Tunnel, confirm the exact domain is already delegated to Cloudflare nameservers in the same account used by `cloudflared login`. Tunnel creation and DNS routing are separate concerns.

### Example

Prefer:

```powershell
nslookup -type=ns cmcaiocrdemo.shop
cloudflared tunnel --config "$env:USERPROFILE\.cloudflared\cmcaiocrdemo.yml" ingress validate
```

## Operator-Facing OCR Flows Need Perceived Progress Even Without Backend Percentages

**Date:** 2026-03-14

### Symptom

After upload, the UI only showed a success message while OCR was running. Users could not tell whether the model was advancing or stalled.

### Root Cause

The backend status API exposes coarse job states such as `pending`, `processing`, and `completed`, but the UI treated that as a binary message instead of turning it into a visible sense of progress.

### Fix

Add a small progress bar below the upload success alert and advance it heuristically based on job state: small visible start, faster growth during `processing`, and snap to `100%` on completion or failure.

### Prevention Rule

If a background OCR job takes more than a moment, show operator-facing progress even when the backend does not provide exact percentages. Coarse state-to-progress mapping is better than a static waiting message.

### Example

Prefer:

```ts
if (status.status === 'processing') {
  return Math.min(92, Math.max(previousValue, 42) + 8)
}
```
## Symptom
- OCR preview panel showed a large empty strip above the actual image, making the left workspace feel cramped.

## Root Cause
- The image viewer used a separate header row and the page added another outer `画像` header, so the preview area lost vertical space twice.

## Fix
- Removed the redundant outer preview header and moved zoom metadata/actions into an overlay toolbar inside the image canvas.

## Prevention Rule
- For document-review screens, avoid stacking multiple headers above a viewer. Put lightweight controls inside the viewer when they do not need their own layout row.

## Example
- `ImageViewer` now renders its zoom toolbar as an overlay, and `TicketPage` / `StampPage` no longer render a separate `画像` header above the preview card.
## Symptom
- After a domain became `Active` in Cloudflare, the root host still served a Hostinger parked page and `api.<domain>` did not resolve.

## Root Cause
- Cloudflare imported legacy DNS records from the registrar/parking provider, and the local `cloudflared` origin certificate was still scoped to an older zone, so `cloudflared tunnel route dns` kept provisioning records under the wrong zone.

## Fix
- Rebuilt the web app against the public API hostname, prepared the named tunnel config, verified the domain now uses Cloudflare nameservers, and identified that the remaining step is replacing the imported DNS records with tunnel CNAMEs in the correct zone.

## Prevention Rule
- When onboarding a new domain to Cloudflare Tunnel, always verify two things before `route dns`: the active zone matches the local `cloudflared` cert scope, and imported DNS records are not still pointing at a parked/legacy host.

## Example
- `cmcaiocrdemo.shop` resolved through Cloudflare but still returned a parked Hostinger page, so the correct public setup requires `@`, `www`, and `api` to point at `b68cf31c-f289-4ac1-a3fc-941736147772.cfargotunnel.com` instead of legacy parking records.
## Symptom
- Backend container crashed on startup after adding public CORS variables for the web domain.

## Root Cause
- `main.py` read `CORS_ORIGINS`, `CORS_METHODS`, and `CORS_HEADERS` from the environment, but `backend/core/config.py` did not declare those settings, so pydantic treated them as forbidden extra inputs.

## Fix
- Declared the optional CORS settings in `backend/core/config.py` so production config can accept the same env vars that `main.py` already uses.

## Prevention Rule
- If application code reads an environment variable through the settings model, declare that variable in the settings schema as well, even when runtime parsing happens elsewhere.

## Example
- `Config` now includes `CORS_ORIGINS`, `CORS_CREDENTIALS`, `CORS_METHODS`, and `CORS_HEADERS`, which keeps backend startup aligned with the public web deployment env.
## Symptom
- The public site loaded on other machines, but login requests still went to `http://localhost:9999/auth/login`.

## Root Cause
- `docker-compose.yml` falls back to `http://localhost:9999` when `WEBAPP_API_BASE_URL` is missing, and a later rebuild happened without the temporary publish-shell environment variable, so the production bundle regressed to localhost.

## Fix
- Added a repo-level `.env` with `WEBAPP_API_BASE_URL=https://api.cmcaiocrdemo.shop` and updated the publish script to persist that value before rebuilding.

## Prevention Rule
- For public static frontend deployments built via Docker Compose, persist the production API base URL in a stable compose env file instead of relying only on a transient shell environment variable.

## Example
- The webapp now rebuilds against `https://api.cmcaiocrdemo.shop` even after later `docker compose up -d --build` runs from a fresh shell.
## Symptom
- Even after deploying the public API hostname, users on other machines still saw login requests targeting `localhost`.

## Root Cause
- The frontend config carried a hardcoded localhost fallback, so any case where build-time injection was missed or stale assets were reused could regress browser requests back to the local-only origin.

## Fix
- Replaced the naive fallback with hostname-aware API resolution and added tests for local, public-demo, and generic domain cases.

## Prevention Rule
- Public web clients should never rely on a localhost-only fallback in runtime config; fallback logic must be environment-aware and safe for remote clients.

## Example
- `resolveApiBaseUrl()` now maps `cmcaiocrdemo.shop` and `www.cmcaiocrdemo.shop` to `https://api.cmcaiocrdemo.shop`, while still keeping `http://localhost:9999` for local development.
## Symptom
- Docker Desktop crashed on startup after the Docker data folder had been deleted to free space, and the app stack plus public tunnel both went down.

## Root Cause
- The Docker WSL data path on `C:\Users\Acer\AppData\Local\Docker\wsl` no longer matched the restored storage target on `D:\DevRelocated\Docker\wsl`, and Docker also had leaked helper processes (`com.docker.build`, then `docker-sandbox`) that blocked engine startup until they were cleared.

## Fix
- Recreated `D:\DevRelocated\Docker\wsl`, re-pointed `C:\Users\Acer\AppData\Local\Docker\wsl` back to it as a junction, terminated the leaked Docker helper processes, then restarted Docker Desktop and rebuilt the stack.

## Prevention Rule
- If Docker data is relocated off the system drive, keep the junction target and the actual storage folder in sync; after deleting or moving Docker data, verify the WSL junction and clear leaked Docker helper processes before diagnosing deeper engine failures.

## Example
- In this recovery, Docker only came back after `C:\Users\Acer\AppData\Local\Docker\wsl` was restored as a junction to `D:\DevRelocated\Docker\wsl` and the stuck `docker-sandbox` process was terminated.
## Symptom
- The delivery-time model could be retrained only by manually editing CSV files and running scripts, which made it hard to grow the dataset from real usage.

## Root Cause
- Training data management lived only in ad-hoc scripts and external folders, so the product had no built-in workflow for collecting fresh samples, reviewing labels, and retraining from the web app.

## Fix
- Added an admin-only Training workflow: upload new ticket images, auto-extract the `配達希望時間帯` row, suggest a label with the current model, let the user confirm or correct it, and trigger retraining through backend/AI APIs.

## Prevention Rule
- When a model depends on incremental human-labeled samples, treat data collection and label confirmation as a first-class product workflow instead of leaving it as an offline script-only process.

## Example
- The new `Training` menu stores row crops inside `ai/data/delivery_time/user_samples`, so retraining no longer depends on the old external image folder layout.
## Symptom
- In the new Training flow, users reported that a batch of uploaded images seemed to add only a small subset, and even after retraining the delivery-time detector still failed on the same newly uploaded examples.

## Root Cause
- The upload API itself was fine, but the retraining pipeline assembled the active manifest incorrectly: it filtered the base dataset down to `row_crop` rows only, which silently dropped the curated `full_image` labels, and it also allowed repeated confirmed uploads of the same filename to overweight stale duplicates. On top of that, upload failures were not logged or shown with per-file detail, which made diagnosis much harder than it needed to be.

## Fix
- Rebuilt active-manifest generation so retraining now merges the full base dataset (`training_manifest.csv` plus `image_labels.csv`), dedupes confirmed user samples by latest filename, and tags user-confirmed row crops separately so the trainer can weight them more heavily. Added explicit server-side logging for per-file upload failures and surfaced the exact failed filenames/messages in the Training UI.

## Prevention Rule
- For iterative ML retraining, verify the manifest builder with tests instead of assuming the dataset assembly is correct; if base labels, synthetic rows, and user-confirmed samples are mixed, preserve all three intentionally and log failures at per-file granularity.

## Example
- After the manifest fix and stronger weighting of `user_row_crop` samples, the previously failing eight-image batch for `配達希望時間帯` evaluated correctly at `8/8` on the updated predictor.
## Symptom
- The Training screen accumulated many repeated uploads of the same filenames, and users had no reliable way to tell how far retraining had progressed or whether the retrained model had actually improved.

## Root Cause
- Uploaded samples were appended forever with no duplicate replacement policy, and the retraining status payload only exposed a coarse `running/completed` flag with no progress or evaluation summary.

## Fix
- Added duplicate cleanup that keeps only the preferred/latest sample per filename and removes stale assets, then extended training status with `progress_percent`, `current_step`, and a small post-training report covering manifest size and evaluation accuracy on full-image samples.

## Prevention Rule
- Any in-product training workflow should be opinionated about duplicate sample handling and should always return enough runtime/reporting metadata for users to see both training progress and training quality.

## Example
- After restart, the duplicate-heavy `samples.json` was reduced to unique filenames only, and the Training UI now shows a progress bar during retrain plus a basic report such as `9/10` evaluation accuracy when training completes.
## Symptom
- When training uploads failed from another device, the team could not tell afterwards which batch failed, which filenames were involved, or what the exact extraction error was unless someone manually replayed the request and watched logs live.

## Root Cause
- Upload failure information only existed transiently in the immediate API response and partial console logs; there was no persisted batch-level history tying together actor, source, created/failed counts, filenames, and failure reasons.

## Fix
- Added a persisted upload-batch history for the training flow, surfaced through API and UI. Each batch now stores a `batch_id`, timestamp, actor, source IP, created filenames, failed filenames, and exact per-file error messages, with a capped history window to avoid unbounded growth.

## Prevention Rule
- For any user-driven ingestion workflow where files can fail independently, persist per-batch/per-file outcomes in a queryable history instead of relying on ephemeral toasts or live tailing logs.

## Example
- After this change, a bad upload like `bad.txt` is recorded in upload history with `failed_count=1` and `error_message=Failed to decode uploaded image`, and the same history is visible from both local and public training pages.
## Symptom
- A real training upload batch mixed two internal ticket layouts, but the delivery-time training flow only accepted `template2`, so six valid images were rejected with `Unsupported template for delivery-time training: template1`.

## Root Cause
- Delivery-time extraction logic was split across inference, training upload, manifest evaluation, and the offline trainer. Only the main detector had been made more flexible; the trainer still hardcoded `template2` ROI and the row-crop evaluation path even reconstructed a fake `template2` canvas instead of scoring the row patch directly.

## Fix
- Centralized delivery-time row localization around shared helpers in `modules/controller/delivery_time.py`: explicit ROI when known, otherwise infer the row from the red guide band in the wide warp. Added `predict_row_patch()` so row-crop evaluation and training no longer depend on pretending every sample is `template2`, and updated the offline trainer to use the same shared localizer plus default slot boxes relative to the extracted row.

## Prevention Rule
- When supporting multiple document layouts, keep localization logic in one shared place and make training/evaluation consume the same extracted representation as inference. Avoid hidden template assumptions in offline scripts, or new layouts will fail in only part of the pipeline.

## Example
- After the refactor, `template1` images are no longer rejected just because of their template class; both upload-time extraction and retraining use the same row-localization path, and the containerized trainer completed successfully with the updated manifest and model metadata.
## Symptom
- After users uploaded and confirmed new delivery-time samples, retraining appeared to finish, but running OCR on those same images still produced old 50/50 behavior from the worker side.

## Root Cause
- The newly trained SVM and metadata were written to disk, but the ticket OCR worker kept a singleton `DeliveryTimeDetector` in memory through `ModelFactory` and `TicketPipeline`. That meant the evaluator or a fresh process could see the new model, while the long-lived worker process could still serve the old one until restart. On top of that, if the service restarted during retraining, `training_state.json` could remain stuck at `running` forever even though the background thread had been lost.

## Fix
- Made `DeliveryTimeDetector` reload itself automatically when the model or metadata file timestamp changes, so inference picks up fresh weights without needing a worker restart. Also added startup recovery in the training service to convert stale `running` states into an explicit interrupted failure message that prompts the user to rerun training.

## Prevention Rule
- Any in-process model cache must either be version-aware or watch artifact changes; otherwise UI-triggered retraining will silently diverge from worker inference. Likewise, background training jobs that are not externally persisted must recover stale `running` state on restart.

## Example
- After this fix, retraining through the backend API completed with `18/18` confirmed-sample accuracy, and end-to-end OCR requests for `IMG_4037.JPEG` and `IMG_4033.JPEG` returned the expected `DeliveryTimeCode` values `19_21` and `12_14` through the normal ticket status API.
## Symptom
- When regular users uploaded ticket or stamp images for OCR, there was no durable server-side history for who uploaded what, from which client, and at which stage the request later failed.

## Root Cause
- The production OCR upload flow only returned a one-shot API response and then relied on transient runtime logs plus downstream job tables. That made it slow to diagnose "user uploaded but no detection" cases because request metadata and intermediate failure stages were not persisted in one place.

## Fix
- Added a shared upload-audit service that persists ticket and stamp upload history as capped JSON records under backend storage. Each record now tracks actor, source IP, user agent, filename, content type, description, session/job IDs, storage path, AI job ID, upload/final status, quality status, error message, and a compact result summary. Wired this into both ticket and stamp upload flows and exposed admin-only history endpoints for quick inspection.

## Prevention Rule
- For any user-facing ingestion flow that continues asynchronously after upload, persist a minimal audit trail at the request boundary and update it through downstream processing stages. Do not rely on ephemeral console logs as the only source of truth for support/debugging.

## Example
- After this change, support can call `/tickets/upload-history` or `/stamps/upload-history` and immediately see whether a user upload failed during storage, AI dispatch, validation, or final processing, together with the originating username, source IP, filename, and final error.
## Symptom
- The delivery-time selector (`配達希望時間帯`) behaved too much like a brittle low-data classifier: with limited samples it could return wrong slots or `none` even though a human would infer the marked option from the simple fixed layout.

## Root Cause
- The previous implementation relied almost entirely on HOG + linear SVM over each option patch. That made the model sensitive to lighting, print texture, and neighboring class similarity, while ignoring the strong structural prior of the form: one row, fixed boxes, and handwritten marks that should stand out relative to sibling options.

## Fix
- Introduced a reusable hybrid fixed-option selector that combines calibrated model scores with rule-based mark evidence derived from per-option patches. The rule scorer focuses on ring/core ink, edge, and colored-stroke signals, normalized across sibling options in the same row. Training now calibrates hybrid weights and thresholds automatically from labeled rows, and delivery-time inference uses the same hybrid selector instead of pure SVM ranking.

## Prevention Rule
- For fixed-layout selection regions with few classes and limited data, do not treat the problem as pure OCR/classification. Use structural priors and relative per-row comparison so the system behaves closer to a human heuristic while still remaining trainable and extensible.

## Example
- After adding the hybrid selector and calibrating it during training, the delivery-time detector evaluated at `22/22` on the current user full-image set while still keeping a reusable path for future fixed-option regions beyond `配達希望時間帯`.
## Symptom
- New unseen ticket images such as `IMG_4129.JPEG` and `IMG_4130.JPEG` were being predicted as `morning` with very high confidence even though the rule-style evidence in the option row pointed toward later delivery windows.

## Root Cause
- The first hybrid rollout still allowed calibration to collapse back to `model_weight=1.0`, so runtime behaved like pure SVM whenever training accuracy preferred it. That meant strong rule contradictions were ignored, and a first-slot bias in the classifier could dominate the final decision.

## Fix
- Added conflict-aware blending to the reusable fixed-option selector: when model and rule rankings disagree strongly and the rule winner has clear support, the selector automatically raises rule influence to a minimum floor before making the final decision. This keeps the generic hybrid framework extensible while preventing the model from steamrolling obvious structured evidence.

## Prevention Rule
- In hybrid selectors, never let calibration silently reduce rule influence to zero without a conflict safeguard. If model and structural evidence diverge sharply, the runtime decision layer must have a generic way to back off pure-model confidence.

## Example
- After the conflict-aware blending change, the system reprocessed the previously wrong unseen files `IMG_4129.JPEG` and `IMG_4130.JPEG` without retraining on them and returned `18_20` for both through the normal ticket upload/status API.
## Symptom
- After adding more aggressive slot-boundary refinement and template-residual rule features, training-time report quality dropped sharply and live behavior diverged between stored row-crops and full-image uploads.

## Root Cause
- We were applying the same dynamic boundary-refinement path to two different operating modes: normalized row-crops used for training/evaluation and live full-image rows extracted from ticket uploads. The refinement helped some live images but hurt many pre-cropped evaluation samples, so a single path could not serve both well.

## Fix
- Split runtime into two paths: `predict_row_patch()` stays conservative and uses the default static slot boxes for row-crop/training evaluation, while live full-image inference in `predict()` computes both static and refined candidates and then picks the safer result with a conflict-aware chooser. That recovered stability for stored samples while still letting live uploads benefit from refinement when it is genuinely clearer.

## Prevention Rule
- When adding geometry refinement to fixed-layout detectors, validate separately on normalized row-crops and on live full-image inputs. If the two modes behave differently, keep distinct inference paths instead of forcing one refinement strategy onto both.

## Example
- With the dual-path chooser in place, the live recheck of the two unseen files shifted from the earlier wrong `morning/18_20` behavior to `12_14` for `ticket_130.jpg` and abstaining with `none` for `ticket_131.jpg`, while row-crop evaluation recovered from `11/27` to `19/27` without retraining on those files.
## Symptom
- Two new live ticket uploads (`IMG_3834.JPEG` and `IMG_3835.JPEG`) were still wrong after the earlier hybrid rollout: one weak refined result was being promoted past a safer abstain, and one adjacent-slot disagreement was still being resolved in favor of the model even though the rule evidence leaned to the neighboring option.

## Root Cause
- The live chooser promoted any refined non-`none` result whenever static localization abstained, even if the refined margin was barely above zero. Separately, the hybrid selector only had a strong-conflict rule floor for large model/rule disagreements, not for the common “adjacent slot” case where the rule and model disagree by one box and the rule winner is slightly stronger.

## Fix
- Tightened live promotion so a refined positive label only overrides static `none` when its confidence and margin are both clearly above the decision boundary. Added an adjacent-slot conflict override to the generic fixed-option hybrid selector so neighboring-option disagreements can raise rule influence without requiring a full hard conflict. This let the system abstain on the weak `IMG_3834` case and flip `IMG_3835` from `14_16` to `16_18` without retraining on either image.

## Prevention Rule
- For fixed-option detectors, treat “adjacent slot disagreement” as its own error mode. It is common enough that it should have a dedicated runtime safeguard, separate from both generic thresholding and large-conflict fallbacks.

## Example
- After the patch, live retest through `/tickets/upload` changed `IMG_3834.JPEG` from an incorrect `16_18` guess to `none`, and `IMG_3835.JPEG` from `14_16` to `16_18`, while the selector/unit test suite still passed end to end.
## Symptom
- `IMG_3835.JPEG` was confirmed by the user as `午前中`, but runtime still predicted `16_18` even after improving hybrid blending and adding slot-specific print templates.

## Root Cause
- The decisive failure was not classifier weight alone but a small row-localization drift: shifting the delivery-time row ROI slightly to the right made `午前中` emerge strongly on that image. However, a naive “search nearby ROIs and pick the most confident answer” strategy was not safe, because it overfit single images and dropped accuracy on the broader confirmed full-image set from `28/36` to `15/36`.

## Fix
- Keep the safer runtime path and do not ship brute-force ROI search just because it fixes one image. Treat this as a localization problem that needs a stronger row-alignment method, not a threshold tweak. Slot-specific templates are useful groundwork, but they are not enough on their own when the row crop itself drifts.

## Prevention Rule
- When a localized fixed-option detector fails on a new image, do not assume “more search around the ROI” is automatically a good production fix. Always validate any ROI-search heuristic against the whole confirmed set before promoting it, because localization brute force can silently tank overall stability.

## Example
- For `IMG_3835.JPEG`, ROI perturbation could force the correct `午前中` label, but the same heuristic changed many previously correct confirmed samples to wrong labels such as `20_21`, `18_20`, or `no_preference`, so it was rejected.
## Symptom
- A new batch of five user-uploaded images, all known by the user to be `午前中`, produced zero `morning` detections. The live outputs were a mix of `none`, `18_20`, and `no_preference`.

## Root Cause
- The fixed `template2` row ROI was too rigid for some real-world tickets. For several of these images, the dynamic red-guide localizer found a row that was shifted slightly to the right, and that shifted row made `午前中` emerge with strong confidence. A fully generic ROI-search override was still unsafe overall, but the pattern was specific enough to isolate: `template2`, inferred row shifted right, inferred result = `morning`, and inferred confidence very high.

## Fix
- Added a narrow runtime heuristic in `delivery_time.predict()`: when `template2` is active, the dynamic inferred row ROI is significantly right-shifted from the fixed ROI, and the inferred candidate is `morning` with high confidence, prefer that inferred `morning` result over the fixed-ROI path. This improves a common real-world drift mode without enabling broad ROI search for every class.

## Prevention Rule
- When a localization issue only manifests for one semantic option (here `午前中`), prefer a tightly scoped override tied to a measurable geometric signal rather than a global ROI-search heuristic. Validate the override against the existing confirmed set before shipping it.

## Example
- After the `template2` inferred-`morning` override, the five-image morning batch improved from `0/5` morning detections to `3/5`: `IMG_3750.JPEG`, `IMG_3751.JPEG`, and `IMG_3752.JPEG` switched to `morning`, while `IMG_3749.JPEG` stayed `none` and `IMG_3753-mark.JPEG` stayed `no_preference`.
## Symptom
- Two remaining `template2` morning cases (`IMG_3749.JPEG` and `IMG_3753-mark.JPEG`) still failed even after confirming their labels and retraining. One kept landing on evening slots, and the other stayed `none`.

## Root Cause
- User-confirmed samples with both `original_path` and `row_crop_path` were being trained twice. The `user_row_crop` copies were noisier and could be geometrically off relative to live inference, which diluted the full-image signal. Separately, the current morning rescue logic only looked at one inferred ROI, but these two images needed a very small, right-shifted ROI search around the fixed `template2` band before `午前中` became dominant.

## Fix
- Changed training manifest generation to prefer `user_full_image` whenever the original uploaded image exists, and only fall back to `user_row_crop` when no original is available. Also updated the trainer to use refined slot boxes for full-image samples so training geometry matches live geometry more closely. On top of that, added a narrow `template2` morning-search heuristic that only activates for low-confidence `none/no_preference/evening` outcomes and only promotes `morning` when the shifted candidate is overwhelmingly strong.

## Prevention Rule
- Do not train the same confirmed user sample through both original and row-crop paths unless you have proven they are geometrically equivalent. For live ROI rescues, keep search windows narrowly scoped to the failure mode and validate them against the full confirmed set before shipping.

## Example
- After preferring original images in training and adding the narrow morning-search heuristic, live retest through `/tickets/upload` changed `IMG_3749.jpg` (ticket `202`) and `IMG_3753-mark.jpg` (ticket `203`) to `DeliveryTimeCode=morning` with confidence `1.0`.
## Symptom
- Newly confirmed training images (`IMG_3761.JPEG`, `IMG_3739.JPEG`, `IMG_3737.JPEG`) were included in retraining, but live OCR still returned `none` or `no_preference` for some of them right after retrain. This made the system feel like retraining was unstable and production behavior kept drifting.

## Root Cause
- Two different issues were mixed together. First, live chooser logic could still discard a very strong static answer when refined localization abstained, which hurt cases like `IMG_3761.JPEG`. Second, some template2 images needed a very narrow shifted-ROI rescue for `morning` or `20_21`, but the existing heuristics only covered a subset of those patterns. Separately, runtime and training both read the same artifact files, so every retrain immediately changed live behavior.

## Fix
- Added a conservative static-rescue path: when static is highly confident and refined collapses to `none`, keep the static answer. Added two narrow template2 rescues: one for low-confidence `none/no_preference -> morning`, and one for strong `no_preference -> 20_21` conflicts. Then split runtime artifacts from training artifacts: retraining continues to write candidate files, while live OCR now reads dedicated production files (`delivery_time_production_*.xml/json`) when present.

## Prevention Rule
- Do not let retraining overwrite the exact artifacts used by production inference. Keep candidate and production model files separate, and only promote to production after verifying live behavior on representative cases. Also, when mixing static and refined localization, add explicit safeguards for “strong static vs abstaining refined” and for class-specific shifted-ROI rescues that you have validated across the confirmed set.

## Example
- After the runtime fixes, live retest of the three newly confirmed samples returned the intended labels: `IMG_3761.JPEG -> 18_20`, `IMG_3739.JPEG -> morning`, and `IMG_3737.JPEG -> 20_21`. After seeding production files and restarting `ai/worker`, runtime resolved to `/app/weights/delivery_time/delivery_time_production_svm.xml` and `/app/weights/delivery_time/delivery_time_production_metadata.json`, and a production retest of `IMG_3739.JPEG` (ticket `223`) still returned `DeliveryTimeCode=morning`.

## Symptom
- The ticket output review panel felt too tall and slow to scan because every field stacked its label above the input, and postal codes could be edited in inconsistent formats.

## Root Cause
- The review form reused the default vertical field layout that was fine for general forms but too verbose for a dense OCR verification panel. Postal code inputs were also passed through unchanged, so the display could drift away from the standard `xxx-xxxx` format during OCR hydration or manual edits.

## Fix
- Switched ticket output fields to an inline review layout with label and input on the same row, changed address fields to single-line inputs for denser scanning, and normalized sender/receiver postal code values through a shared formatter so both OCR-loaded and manually edited values stay in `xxx-xxxx` form.

## Prevention Rule
- For OCR verification screens, prefer inline label-input rows and normalize structured fields like postal codes at both hydration time and edit time so the panel stays compact and consistent without relying on users to reformat values manually.

## Example
- After the change, the `TO` and `FROM` review sections render `郵便番号`, `住所`, `氏名`, and `電話番号` on single-line rows, and entering `1234567` is immediately displayed as `123-4567`.

## Symptom
- Newly trained `午前中` samples (`IMG_3779.JPEG`, `IMG_3753-mark.JPEG`, `IMG_3749.JPEG`) still looked wrong when retested through live OCR. One file (`3779`) only started working after a manual production sync, while the other two still stayed on evening or abstain paths.

## Root Cause
- Two separate issues overlapped. First, training updated only the candidate artifacts, while live OCR still resolved the older production artifacts, so retraining was not automatically visible in production. Second, the existing `template2` morning rescue only handled low-confidence `none/no_preference` cases and searched too narrow a shifted ROI set, so it never rescued cases where static localization confidently but incorrectly landed on adjacent evening slots.

## Fix
- Promoted the latest candidate artifacts to production so live OCR actually used the retrained model, then expanded the `template2` shifted-morning search to a small set of right/down ROI offsets and allowed a rescue from adjacent evening slots only when the shifted `morning` candidate is overwhelming (`confidence >= 0.998`, `margin >= 0.7`, strong morning score, positive x-shift).

## Prevention Rule
- When candidate/production models are split, always verify whether a failed retest is hitting stale production artifacts before assuming retraining failed. For localization rescues, only expand the search window together with very strict acceptance gates, so you fix the target drift pattern without turning the runtime into a broad brute-force search.

## Example
- After promoting the latest candidate and adding the strict shifted-morning rescue, live retest returned `IMG_3779.JPEG -> morning` (ticket `240`), `IMG_3753-mark.JPEG -> morning` (ticket `241`), and `IMG_3749.JPEG -> morning` (ticket `242`).

## Symptom
- `IMG_3852.JPEG` had already been confirmed into training as `希望しない`, but live OCR still kept returning `14_16` with high confidence even after retraining. This made it look like the new sample had not been learned at all.

## Root Cause
- The production model had a specific localization conflict on this image: the static row path strongly preferred `no_preference`, the inferred row path also preferred `no_preference`, but the refined row path alone flipped to `14_16`, and the live chooser trusted that refined result. So the issue was not “training ignored the sample”; it was a three-way disagreement where two paths agreed on `希望しない` and the runtime still picked the dissenting path.

## Fix
- Added a narrow `template2` consensus rescue for `no_preference`: when static and inferred both agree on `希望しない`, static confidence and margin are already strong, inferred is at least moderately supportive, and refined disagrees with only a limited margin advantage, prefer the static `no_preference` result instead of the refined daytime slot.

## Prevention Rule
- When a confirmed training sample still fails after retraining, compare static, refined, and inferred localization paths before assuming the classifier is wrong. If two localization paths agree on the same class and only one path disagrees, prefer a narrowly scoped consensus rescue over broad retraining or blanket threshold shifts.

## Example
- After the `no_preference` consensus rescue, live retest returned `IMG_3852.JPEG -> no_preference` (ticket `249`) while keeping nearby regressions fixed: `IMG_3779.JPEG -> morning` (ticket `251`), `IMG_3753-mark.JPEG -> morning` (ticket `252`), and `IMG_3749.JPEG -> morning` (ticket `253`).

## Symptom
- The stamp OCR workspace only showed raw denomination rows, so users could not tell how far processing had progressed, how many sheets were found in total, or where the detector had actually read each stamp value from on the preview image.

## Root Cause
- The AI stamp pipeline returned only a flattened denomination count map, while the web UI had no structured progress model or detection geometry to render. Without explicit totals and bounding boxes, the page could only show edited counts after completion and had no way to explain in-flight processing or visualize detections.

## Fix
- Extended the stamp AI result to include structured `stamp_items`, `total_stamps`, `total_value`, and `detected_boxes`, then wired the backend and web app to consume that richer payload. The stamp page now shows a progress bar while polling, compact summary cards for total sheets/amount/detection count, and overlay boxes on the image viewer for detected stamp and price regions.

## Prevention Rule
- For OCR flows that return per-item detections, keep the result payload structured from AI to UI instead of collapsing it early into a flat map. That preserves enough information to add progress reporting, totals, and visual overlays without having to reverse-engineer the response later.

## Example
- After the change, `切手OCR` can display `総枚数`, `合計金額`, and `検出件数` from the same result payload that drives editable denomination rows, while the preview image renders labeled overlay boxes on top of the detected stamp regions.

## Symptom
- Once stamp OCR started rendering detection boxes on the preview, the overlay was useful for verification but visually noisy when users only wanted to read or edit denomination totals.

## Root Cause
- The preview always rendered overlays whenever detection geometry was available, with no user-level control to temporarily hide the boxes while keeping the same image and OCR result on screen.

## Fix
- Added a lightweight toggle in the `切手OCR` preview header so users can switch bounding boxes on and off without losing the current image, OCR result, or review edits. The toggle is disabled when there are no detections to show.

## Prevention Rule
- When adding visual OCR debug overlays to a production-facing review screen, always pair them with an explicit visibility toggle so the same screen can serve both verification and clean data-entry use cases.

## Example
- After the change, `切手OCR` shows `枠を隠す` / `枠を表示` above the preview, and the image viewer receives either the real overlay list or an empty one depending on the user's toggle state.

## Symptom
- `伝票OCR` and `切手OCR` diverged: stamp preview could visually explain detections with toggleable overlays, while ticket preview still showed only the raw image even though the OCR pipeline already knew the merged field regions.

## Root Cause
- The ticket AI flow computed merged bounding rectangles during post-processing, but that geometry was discarded before the response reached the web app. Without a structured `DetectedBoxes` payload, the preview had nothing to render or toggle.

## Fix
- Preserved merged ticket field boxes in the AI result as `DetectedBoxes`, exposed them through the existing status payload, parsed them on the web side, and added the same `枠を隠す / 枠を表示` preview toggle pattern used by `切手OCR`.

## Prevention Rule
- If an OCR pipeline already computes stable merged field geometry, return it in the response instead of throwing it away. That keeps debug overlays, reviewer aids, and future admin tooling cheap to add without re-deriving layout from raw OCR text later.

## Example
- After the change, `伝票OCR` can draw overlay boxes labeled `宛先 郵便番号`, `差出人 住所`, `時間帯`, and other merged fields on top of the preview image, and users can hide the boxes with a single toggle when they want a clean view.

## Symptom
- Ticket OCR overlay boxes created more frustration than value because users expected pixel-perfect mapping on the raw uploaded preview, and even a technically explainable coordinate mismatch made the feature feel broken.

## Root Cause
- The feature depended on mixing OCR geometry, preview image state, and UI expectations in a workflow where a slightly wrong visual cue is worse than no cue at all. The reviewer goal on `伝票OCR` is fast confirmation of extracted fields, not detector debugging.

## Fix
- Removed the ticket overlay toggle and preview boxes entirely, keeping `伝票OCR` focused on the stable field review flow. We kept visual overlays only on `切手OCR`, where the boxes directly support quantity/value verification and already align with that review task.

## Prevention Rule
- Do not ship OCR overlay visuals on user-facing review screens unless the mapping is reliably accurate and clearly improves the user task. If an overlay risks undermining trust, remove it instead of asking users to tolerate “mostly right” positioning.

## Example
- After the rollback, `伝票OCR` returned to a clean image preview with no bounding-box toggle, while `切手OCR` still keeps its optional overlay feature for stamp verification.

## Symptom
- A newly added local-dev webapp script looked correct on paper but never opened port `5174`. Running the script showed Vite starting as `vite 0.0.0.0 5174` and then failing with `CACError: Unused args`.

## Root Cause
- In this environment, forwarding extra CLI flags through `npm run dev -- ...` did not preserve the named Vite options cleanly. The flags were flattened into positional arguments before they reached the Vite CLI.

## Fix
- Switched the local webapp launcher to call `npx vite --host 0.0.0.0 --port 5174` directly instead of forwarding flags through `npm run dev`.

## Prevention Rule
- For local dev helper scripts that need explicit host/port control, prefer calling the underlying CLI directly (`npx vite`, `python -m uvicorn`, etc.) instead of relying on argument passthrough through package scripts.

## Example
- After the change, `ops/local-dev/start-webapp-local.ps1` correctly starts the isolated local webapp on `http://localhost:5174` without affecting the public app on `http://localhost:5173`.

## Symptom
- A new OCR pipeline for `領収証` passed unit tests but crashed immediately in the real Docker runtime, and early extraction quality was poor on the first two real samples because `amount` formatting and `issuer_address` line grouping were still too naive.

## Root Cause
- The receipt controller assumed the text detector returned a plain list, so `if not detections` blew up when the runtime returned a NumPy array. On top of that, the first heuristics only handled comma-separated amounts and treated any long bottom line as an address, which broke on receipts where the amount was OCR'd as `21.913-` and the address started at a `〒` anchor across multiple lines.

## Fix
- Changed the detector guard to use `detections is None or len(detections) == 0`, then tightened receipt-specific extraction rules:
  - accept `.` as a thousands separator in the amount parser,
  - normalize digits before formatting,
  - detect postal-code anchors with a stricter regex,
  - build the issuer address from the `〒...` line plus the next adjacent address fragment while stripping `TEL`, tax labels, and payment-method text.

## Prevention Rule
- For new OCR flows, validate once in the real container runtime before trusting host-side tests, especially when detector outputs may be NumPy arrays or other non-list containers. When extracting fields from semi-structured documents, prefer anchor-driven grouping (`〒`, `Tel`, `No.`) over “longest line wins” heuristics.

## Example
- After the fix, one-off Docker validation on `IMG_6685.jpeg` and `IMG_6686.jpeg` returned:
  - `IMG_6685`: `amount=10,000`, `receipt_date=2026-01-16`, `issuer_address=〒170-0002 東京都豊島区巣鴨5-32-9,604`, `issuer_phone=070-1070-9584`
  - `IMG_6686`: `amount=21,913`, `receipt_date=2026-01-17`, `issuer_address=〒170-0002 東京都豊島区巣鴨5-32-904`, `issuer_phone=070-1070-9584`

## Symptom
- In the new `領収証OCR` flow, the lower issuer fields looked worse than the raw OCR blocks: `issuer_address` leaked part of the phone label and `issuer_phone` was truncated to `070-9584` even though the OCR output still contained the full line.

## Root Cause
- The receipt parser assumed phone numbers only used dash-like separators, so OCR output such as `TLl:070.1070-9584` only matched the tail `070-9584`. The address cleanup also only stripped canonical `TEL`, so the OCR-mangled `TLl:` prefix survived and got appended into the address.

## Fix
- Broadened receipt phone parsing to accept dot and space separators, centralized phone extraction in a helper that normalizes to the final hyphenated format, and expanded tel-label cleanup to catch OCR variants like `TLl:` before composing the issuer address.

## Prevention Rule
- When a field extractor depends on printed labels like `Tel`, design the cleanup for OCR-tolerant variants rather than only the ideal spelling. If raw OCR already contains the correct digits, fix the parser before assuming the model is wrong.

## Example
- After the fix, a line like `TLl:070.1070-9584` produces `issuer_phone=070-1070-9584` and no longer contaminates `issuer_address`.

## Symptom
- `領収証OCR` still had two parser-level regressions on real local samples after the first pass:
  - `issuer_address` could still absorb `Tel` fragments or bottom-form noise like `手`, `形`, `3`
  - the highlighted top payee/company field stayed blank even though OCR already returned a merged block containing the company name.

## Root Cause
- The receipt parser still anchored the address off any `ddd-dddd` pattern, so a phone line like `070-1070-...` could be misread as a postal-code anchor. It also relied too much on merged lines, which let receipt-form labels leak into the address. Separately, payee extraction only looked in a very shallow top band, so valid merged top blocks lower on the warped image were skipped entirely.

## Fix
- Tightened postal detection so phone numbers no longer qualify as postal anchors, switched receipt address assembly to prefer OCR-item grouping around the real `〒...` block, added noise filters for isolated receipt labels and registration-code debris, and widened the top-band payee scan so merged company-name blocks can still be recovered after perspective correction.

## Prevention Rule
- On semi-structured receipts, do not reuse a loose `ddd-dddd` regex as both postal-code and phone logic. Use the strongest available anchor (`〒`) for address grouping, and prefer block-aware parsing over merged-line heuristics when nearby labels and handwritten text can be interleaved.

## Example
- After the fix, local replay on `IMG_6685.jpeg` and `IMG_6686.jpeg` returned:
  - `IMG_6685`: `payee_name=cheJapon株式会社様`, `issuer_address=〒170-0002 東京都豊島区巣鴨5-32-9,604`, `issuer_phone=070-1070-9584`
  - `IMG_6686`: `payee_name=CNCiron株式会社様`, `issuer_address=〒170-0002 東京都豊島区巣鴨5-32-904`, `issuer_phone=070-1070-9584`

## Symptom
- Two newer `領収証OCR` uploads looked much worse than the earlier samples even though the OCR engine still found the correct bottom text blocks. The parsed `issuer_address` leaked date text or registration-code fragments because those receipts omitted the `〒` postal anchor.

## Root Cause
- The receipt parser assumed the issuer area would always start from a postal-code block. On variants that only exposed `住所...`, the fallback logic dropped back to loose line selection and pulled in unrelated neighbors like the receipt date, `T220003`, or `丁1100002`. A top-line crop OCR experiment also overrode better merged-line payee candidates and made the company field noisier.

## Fix
- Added a second anchor path for `住所...` address blocks, filtered registration-code fragments (`T220003`, `丁1100002`) as address noise, and changed top-line crop OCR to fallback-only so it no longer outranks cleaner payee candidates from the original OCR items.

## Prevention Rule
- For semi-structured receipts, always support more than one anchor for the same business field when layout variants are already known. If a rescue OCR pass is added, do not let it override a stronger candidate source unless the primary extractor fails.

## Example
- After the fix, replaying the two problematic local receipts produced:
  - `receipt19`: `payee_name=MC州株式会社様`, `issuer_address=東京都港区芝公園3-1-22 日本ビル5-329`, `issuer_phone=03-4578-4234`
  - `receipt20`: `payee_name=AB(A仏tの株式会社様`, `issuer_address=東京都新宿区西新宿2-8-1-10F`, `issuer_phone=03-6890-4567`

## Symptom
- Even after address parsing was fixed, the `payee_name` field on this receipt family was still the weakest field. The OCR engine consistently found the right top line, but mixed Latin + Japanese company names came back as noisy aliases such as `cheJapon株式会社様`, `cNcJapan株式会社様`, `MC州株式会社様`, or `ABCS0%セのn株式会社様`.

## Root Cause
- The base OCR recognizer is good enough to locate the payee line, but not stable enough to reconstruct recurring company names on these handwritten receipt samples without post-processing. Full-page OCR and focused top-line OCR each exposed different alias variants of the same names.

## Fix
- Added a narrow payee post-correction layer for this receipt family:
  - ensemble the original OCR candidate with focused top-line crop candidates,
  - clean title/`No.` noise from the top line,
  - normalize recurring payee aliases to the canonical company names expected on these samples.

## Prevention Rule
- When a field is visually stable but OCR repeatedly produces the same near-miss aliases, prefer a narrow canonicalization layer over retraining immediately. Keep the mapping explicit, limited to the known document family, and apply it only after the raw OCR candidate has already matched the right semantic field.

## Example
- After the fix, replaying the four local samples produced:
  - `IMG_6685.jpeg` -> `payee_name=CMC Japan株式会社様`
  - `IMG_6686.jpeg` -> `payee_name=CMC Japan株式会社様`
  - `797d4d63-a01b-43bb-8668-ec21bbc5246c.jpg` -> `payee_name=CMC VN株式会社様`
  - `b0eadf97-d034-475c-8595-3d188ba99ff7.jpg` -> `payee_name=ABC Solution株式会社様`

## Symptom
- The `伝票OCR` screen could sit at `92%` forever even though the AI worker had already finished the OCR task. In the database, affected tickets stayed in `processing` with no final result.

## Root Cause
- Ticket result consumption depended on an in-memory `validated_sessions` set inside the backend consumer. If the backend restarted, or validation/result messages arrived out of sync across the two queues, the result message could be dropped as “non-validated” even though the worker had already completed successfully. The UI progress bar intentionally caps at `92%` until the backend marks the ticket `completed`, so the user saw a permanent near-finished spinner.

## Fix
- Removed the hard dependency on the in-memory validation cache when handling ticket result messages. The backend now proceeds with DB-backed result processing whenever a valid `session_id` result arrives, which makes ticket completion resilient to backend restarts and queue timing drift. Added a regression test covering result processing without prior in-memory validation state.

## Prevention Rule
- Do not gate durable message processing on ephemeral in-memory state when the database already contains the source of truth. For multi-queue OCR flows, result consumers must be restart-safe and idempotent.

## Example
- After the fix, replaying the stuck public ticket session `session_880fe0cd0cce43da` moved ticket `293` from `processing` to `completed` instead of leaving the UI stuck at `92%`.

## Symptom
- `配達希望時間帯` on the Yuupack `Test data` folder still had a mix of correct and very wrong answers. Several template2 cases were being filled with high-confidence guesses such as `morning`, `14_16`, or `20_21` even though nearby ROI shifts produced contradictory labels. The worst failures were false-positive `morning` rescues and refined-box predictions overriding stronger static late-slot signals.

## Root Cause
- The template2 delivery-time logic had become too eager in three places:
  - `shifted_morning` accepted a single lucky shifted ROI instead of requiring a real local support cluster,
  - `refined` could override a stronger `static` late-slot result even when the inferred path was weak or abstaining,
  - when `static` and `refined` agreed on the same positive label with weak margins, the runtime still committed even though the inferred path did not support that label.

## Fix
- Tightened template2 runtime selection in [delivery_time.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/modules/controller/delivery_time.py):
  - `morning` rescue now requires clustered shifted-ROI support, not just one best shifted score,
  - strong `static` signals can beat `refined` in specific late-slot conflicts when the inferred path is weak,
  - unstable `static/refined` consensus now abstains to blank instead of guessing,
  - narrow fallback rules let `inferred=morning` win when `static` abstains and `refined` overfits to `14_16`, and let moderate `no_preference` consensus win when both `static` and `inferred` agree against an over-confident refined evening slot.
- Added regression coverage in [test_delivery_time_layout.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/tests/test_delivery_time_layout.py).

## Prevention Rule
- For checkbox-like OCR with ROI-sensitive heuristics, never promote a rescue path from a single high-confidence crop alone. Require either cross-path agreement or a small, spatially coherent support cluster. If the localization paths disagree and no label is stable, return blank instead of a confident-looking guess.

## Example
- Before the fix, the local replay of the labeled Yuupack set was:
  - `4/12` correct
  - `5` wrong non-blank
- After the fix, the same local replay became:
  - `11/14` correct on the full working folder after visually confirming the two `-mark` samples,
  - `3/14` blank instead of wrong,
  - `0` wrong non-blank

## Symptom
- Public `伝票OCR` could still get stuck at `92%` even though the Celery worker had already finished OCR successfully. The result queue was empty afterward, which meant the result message had been consumed somewhere but the ticket row stayed `processing`.

## Root Cause
- The ticket result consumer treated any transient processing failure as terminal and immediately `nack(requeue=False)`'d the result message. That permanently dropped the message from RabbitMQ. So if one result-consumption attempt failed because of a temporary DB/model/mapper race, the ticket had no second chance and the UI stayed at `92%`.

## Fix
- Added bounded retry behavior in [rabbitmq_consumer.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/backend/app/ticket/rabbitmq_consumer.py):
  - on transient validation/result handling failures, the consumer now republishes the message to the same queue with an `x-retry-count` header,
  - only after `3` failed attempts does it drop the message.
- Added regression tests in [test_ticket_processing_failures.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/backend/tests/test_ticket_processing_failures.py) for both requeue and terminal-drop behavior.

## Prevention Rule
- In queue-based OCR pipelines, never permanently drop first-failure result messages unless the failure is definitely non-recoverable. Transient DB or startup races need bounded retries so a single bad consume attempt does not strand the user-facing job forever.

## Example
- After the retry fix, a public ticket like `303` can be reconciled and future transient consumer failures will be retried instead of silently leaving the UI stuck at `92%`.

## Symptom
- `配達希望時間帯` had split behavior across the Yuupack folders: the newer marked/test family was mostly good after the conservative template2 tuning, but the legacy `Training data` family still over-predicted `14_16`, misread weak `none` cases, and occasionally confused low-confidence `19_21` or `morning` labels.

## Root Cause
- One detector path was not enough for both families. The live detector had already been tuned to avoid false positives on the marked/test family, but that same conservative behavior left several older training-family images stuck in known error modes. Replacing the live model wholesale was not acceptable because the temporary training-family model regressed the marked/test set.

## Fix
- Added a narrow shadow-model fallback in [delivery_time.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/modules/controller/delivery_time.py):
  - the live detector still decides by default,
  - a second detector loaded from dedicated shadow artifacts is only allowed to override in a handful of known conflict patterns (`14_16` false positives, weak `none`, low-confidence `19_21`, low-confidence `18_20`, and a rare `morning` vs `12_14` clash),
  - outside those patterns, the shadow detector is ignored.
- Added regression tests in [test_delivery_time_layout.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/tests/test_delivery_time_layout.py).

## Prevention Rule
- When two layout families disagree, do not replace the live OCR model wholesale if one family is already stable. Add a narrowly-scoped shadow fallback that only activates for the exact conflict signatures you have benchmarked, and verify both the legacy and current folders after every change.

## Example
- After the shadow fallback pass, the local Yuupack replay reached:
  - `Training data`: `16/17` correct, `0` blank, `1` wrong
  - `Test data`: `10/12` correct, `2` blank, `0` wrong non-blank

## Symptom
- Even after the conservative/shadow tuning, `IMG_3752.JPEG` on public still returned blank or the wrong slot, and a few `Training data` labels still looked inconsistent with the actual circled marks.

## Root Cause
- Two problems were stacked together:
  - some legacy `Training data` labels were simply wrong (`IMG_3743.JPEG`, `IMG_3747.JPEG`, `IMG_3751.JPEG`, `IMG_3752.JPEG`),
  - the runtime still missed a narrow family of right-edge marks where `20_21` or `希望しない` only became obvious after a slight right/up shift, or where `inferred=20_21` should have beaten a weak `no_preference`.

## Fix
- Corrected the source labels in [image_labels.csv](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/data/delivery_time/image_labels.csv) and fixed the stale confirmed user samples in [samples.json](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/data/delivery_time/user_samples/samples.json).
- Added two narrow runtime rescues in [delivery_time.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/modules/controller/delivery_time.py):
  - prefer `inferred=20_21` over weak `no_preference` on template2 when the inferred path is decisively stronger,
  - allow a right-edge consensus rescue for `20_21` and `no_preference` when several small right/up shifts agree strongly.
- Extended shadow fallback rules so a strong shadow `20_21` or `no_preference` can override the known false-positive `14_16` / `18_20` conflicts.

## Prevention Rule
- When a checkbox-like OCR failure survives several logic passes, inspect the actual cropped row before tuning again. If the visual mark and the stored label disagree, fix the label first. Runtime rescue rules should then be limited to the exact geometry family that the crop review proves out.

## Example
- After correcting the labels and adding the right-edge rescues, the local Yuupack replay became:
  - `Training data`: `17/17` correct
  - `Test data`: `10/12` correct, `2/12` blank, `0` wrong non-blank

## Symptom
- `伝票OCR` showed `配達希望時間帯` bbox in the wrong place on the original upload even though the selected slot on the warped delivery-time canvas was correct, and the rectangle was too coarse to indicate the actual dashed circle the user marked.

## Root Cause
- Two display-only issues were stacked together:
  - the ticket API projected `DeliveryTimeBBox` back to the original image with an inverse matrix that did not match the warp used to build `wide_warp`,
  - the bbox reused the classifier slot band, which is too broad for UI overlay and, on `template2`, starts before the visible dashed-circle band.

## Fix
- In [ticket.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/modules/controller/ticket.py), switched the delivery-time inverse projection to the exact warp metadata used by `warp_delivery_time_canvas`.
- In [delivery_time.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/modules/controller/delivery_time.py), added a display-focused bbox path:
  - keep OCR classification logic unchanged,
  - derive a UI-only focus box around the selected dashed ellipse instead of the full slot band,
  - apply a template2-specific x-shift so the overlay aligns with the visible option circles rather than the row margin.

## Prevention Rule
- For OCR overlays, never assume the classifier crop box is suitable for UI display. If a detector runs on a warped canvas, store and reuse the inverse matrix of that exact warp, and keep display-box calibration separate from model-localization logic so UI fixes do not degrade recognition.

## Symptom
- Some public `伝票OCR` uploads with a clear `16時〜18時` mark returned blank `配達希望時間帯`, even though the circle was visibly present and nearby `template2` cases were still working.

## Root Cause
- A narrow `template2` family landed in an awkward state:
  - the base/static and refined slot layouts both mis-read the marked row as `18_20`,
  - the inferred row localized weakly and triggered `should_abstain_on_unstable_consensus`,
  - the existing shadow model did not rescue this family because it leaned toward `morning` instead of the true `16_18`.

## Fix
- In [delivery_time.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/modules/controller/delivery_time.py), added a narrow visible-band rescue for `template2`:
  - only when `static=refined=18_20`,
  - only when the static margin is weak and the inferred path is a weak `none`,
  - re-score once with slot boxes shifted to the visible band,
  - only promote if that shifted pass returns a very strong `16_18`.
- Added regression coverage in [test_delivery_time_layout.py](C:/Users/Acer/jppost-customer%20(1)/jppost-customer/ai/tests/test_delivery_time_layout.py).

## Prevention Rule
- When a checkbox row is blanked by an abstain rule, inspect the pre-abstain candidates before relaxing the abstain globally. If one layout family has a stable adjacent-slot offset, add a family-specific rescue for that offset instead of weakening the general false-positive guard.

## Symptom
- The camera capture modal guideline appeared directly inside the camera frame and covered too much of the document preview. On Safari, opening the camera could leave the modal without a visible camera view.

## Root Cause
- The guideline panel was absolutely positioned inside the camera stage, so it competed with the document framing area. The video stream was also attached immediately after `setIsCameraOpen(true)`, which can run before the `<video>` ref exists; Safari is especially sensitive to this timing and to missing explicit inline/autoplay video attributes.

## Fix
- Moved camera guidance into a separate modal body column/row outside the video stage, leaving the stage for only video, frame, and a small readiness badge.
- Attached the `MediaStream` in a React effect after the modal renders, set Safari-friendly `autoplay`, `muted`, `playsinline`, and `webkit-playsinline` attributes, and added a fallback from strict camera constraints to `video: true`.
- Added helper tests for camera frame readiness and permission-error detection.

## Prevention Rule
- For in-browser camera capture, keep instructional UI outside the live video frame unless it is a small non-blocking badge. Attach streams only after the video element exists, use explicit inline/autoplay attributes for Safari, and only enable capture after real video dimensions are available.

## Symptom
- On iPhone Safari, the camera modal could still show only the dark framing stage instead of the live camera feed. The user also had to scroll inside the modal before the camera area felt centered and usable.

## Root Cause
- iOS Safari is more sensitive to both camera constraints and user-gesture timing. Requesting high ideal dimensions plus attaching the stream later in an effect can produce a valid stream that never paints a visible video frame. The mobile modal also kept the header before the camera body, so the live stage was pushed down inside a short Safari viewport with a bottom address bar.

## Fix
- Use simpler `facingMode: 'environment'` constraints for iOS WebKit and keep the higher ideal dimensions for non-iOS browsers.
- Render the modal synchronously with `flushSync`, wait one animation frame for the `<video>` to exist, then request and attach/play the stream directly, with a video-frame polling retry.
- Reordered the mobile camera modal so the stage appears first and is sized with `100dvh`, while guideline/header/footer stay below it.

## Prevention Rule
- For iPhone Safari camera UX, prioritize the live video stage first in the modal layout, use `100dvh`/safe-area-aware sizing, avoid heavy ideal camera constraints, and verify that a real video frame paints before enabling capture.

## Symptom
- On mobile, the camera frame had too much vertical spacing and the capture button was not immediately reachable while looking at the live preview. The full sidebar menu also consumed too much vertical space on phone-sized screens.

## Root Cause
- The mobile camera modal still treated guideline/header/footer as equal stacked sections around the live stage, so the capture action could be pushed away from the frame. The responsive sidebar collapsed into a grid but remained in normal document flow instead of becoming a phone-friendly drawer.

## Fix
- Reordered the mobile camera modal so the live stage appears first, the capture/cancel footer comes immediately after it, and the guideline/header are compact secondary sections below.
- Added a mobile hamburger button in the fixed header and converted the sidebar into an off-canvas drawer with a backdrop that closes on route change or tap outside.

## Prevention Rule
- On phone camera workflows, keep the primary action directly adjacent to the live preview. For app navigation on narrow screens, prefer an off-canvas drawer over squeezing a persistent sidebar into the page flow.

## Symptom
- After compacting the mobile camera modal, there was still a large blank gap between the camera frame and the capture button on iPhone.

## Root Cause
- The mobile modal panel was fixed to `100dvh` and used `grid-template-rows: minmax(0, 1fr) auto auto auto`. The first grid row expanded to consume all leftover height, so the stage sat at the top of that oversized row while the footer stayed at the bottom, creating a white spacer between preview and action.

## Fix
- Changed the mobile camera panel to auto-height with `grid-template-rows: auto auto auto auto`, `align-content: start`, and scroll only when content exceeds the viewport.
- Added a CSS regression test that fails if the mobile camera panel reintroduces `1fr` spacing or if the footer no longer follows the stage.

## Prevention Rule
- Do not use a flexible `1fr` row between a camera preview and its primary action on mobile. Use auto rows so the capture button remains adjacent to the live preview, and let secondary guidance scroll below if space is tight.

## Symptom
- The mobile camera modal still appeared too low from the top of the phone screen, and the app header could remain visually above the camera layer.

## Root Cause
- The modal was rendered inside the upload component tree, making it easier for page-level stacking/layout context to visually compete with the app header. Mobile CSS also used centered placement for the modal container, so after switching to auto-height the whole panel could be vertically centered instead of starting near the top.

## Fix
- Rendered the camera modal through a React portal into `document.body`, ensuring it overlays the app shell/header instead of staying inside the page content tree.
- Changed mobile modal placement to `place-items: start center`, reduced safe-area/panel padding, and moved the dashed frame closer to the video top edge.
- Extended CSS regression coverage to assert mobile camera modal placement stays top-aligned.

## Prevention Rule
- Full-screen mobile modals should render at the document body/root layer and explicitly top-align when the primary task starts near the top of the viewport. Avoid vertical centering for camera capture flows unless the full panel height is fixed and intentionally balanced.

## Symptom
- On iPhone 13/14 Plus-sized screens, the `撮影前に確認` guideline card in the camera modal was too short, forcing the user to scroll inside the card to read all shooting notes.

## Root Cause
- The mobile guideline card kept a very tight fixed maximum height from earlier compacting work. That protected the camera/button layout on smaller screens, but wasted available vertical room on Plus-sized devices and clipped the guidance text.

## Fix
- Changed the mobile guideline card to use a viewport-aware `clamp()` height and visible overflow so the full guidance list fits on iPhone Plus-class screens.
- Added CSS regression coverage to assert the guideline does not return to an internally scrolling, overly short panel.

## Prevention Rule
- When compacting mobile camera layouts, size secondary guidance with responsive bounds instead of fixed small heights. Verify both the camera/button adjacency and the guidance `clientHeight` versus `scrollHeight` on the target phone viewport.

## Symptom
- On iPad portrait, the Japan Post sidebar navigation wrapped into two rows, making the menu look cramped and uneven.

## Root Cause
- The tablet breakpoint reused a fixed `repeat(3, ...)` grid for the sidebar. With the brand block plus four tenant links, the fourth link necessarily wrapped to a second row.

## Fix
- Changed the tablet sidebar to a single-row flex layout with nowrap-style behavior and horizontal overflow only as a safety valve.
- Kept the phone breakpoint as a grid/off-canvas hamburger drawer so mobile behavior is unchanged.
- Added CSS regression coverage to prevent the tablet sidebar from returning to the three-column grid.

## Prevention Rule
- Treat tablet navigation separately from phone navigation. Tablet portrait should keep primary tenant nav on one horizontal row when labels are short; reserve the hamburger drawer for narrow phone breakpoints.

## Symptom
- The mobile hamburger button looked visually cheap compared with the Japan Post demo UI, and bounding boxes from a previous OCR result stayed visible after the user selected or captured a new image.

## Root Cause
- The hamburger button used a flat square treatment with plain equal-width bars. File selection only updated `selectedFile`; OCR result state and detected boxes were reset later when the user clicked the OCR execution button, leaving a stale preview overlay window.

## Fix
- Restyled the mobile menu button as a compact glass/pill control with subtle inset shadow, tapered line widths, press feedback, and an animated close state when expanded.
- Added per-page file-selection handlers that reset status, extracted fields, progress, and detected boxes immediately when a new file arrives from upload, drag/drop, or camera capture.
- Added regression coverage for the polished menu CSS and for Ticket/Stamp file selection not bypassing the reset handler.

## Prevention Rule
- Any new file-selection path must clear OCR-derived UI state before showing the new preview. For mobile navigation controls, verify both closed and expanded states visually, not only the drawer behavior.

## Symptom
- A newly submitted ticket image appeared to return an empty extraction result, even though the user expected OCR fields to populate.

## Root Cause
- The latest ticket failed at the validation/alignment stage because the YOLO template detector returned zero detections, so the OCR pipeline never reached text detection or recognition. The frontend showed an empty form without surfacing the backend `error_message`, making a validation failure look like an empty OCR result.

## Fix
- Added a clearer validation error message from the AI worker when the ticket template cannot be detected.
- Updated the Ticket UI to show failed/invalid ticket `error_message` immediately when status polling receives a validation failure.
- Added frontend regression tests for ticket failure messaging.

## Prevention Rule
- When an OCR job can fail before extraction, always surface the stage-specific failure reason in the UI. During debugging, compare DB status, worker stage logs, and direct validator output before treating an empty form as an OCR mapping issue.

## Symptom
- A ticket image that could be recovered by manual OCR execution still failed or hung in the live async pipeline, especially after retries and worker restarts.

## Root Cause
- The ticket template detector was too brittle on darker/low-contrast captures and missed some valid labels unless contrast was normalized first.
- After that validator fix, Celery `prefork` workers proved unstable for the demo OCR runtime: direct task execution succeeded, but prefork child processes could leave jobs stuck in `processing` with an unacked task.

## Fix
- Added lightweight alignment-detection fallbacks in the ticket aligner: original grayscale, CLAHE-normalized grayscale, then sharpened grayscale.
- Added AI regression tests for the alignment fallback helper.
- Switched the demo worker runtime to `--pool=solo --concurrency=1` and aligned env defaults so OCR jobs run in a single stable process.
- Re-verified end-to-end by re-uploading the previously failing image; the retry completed successfully with extracted fields.

## Prevention Rule
- For demo OCR stacks, prefer process models that are known-safe for the active inference runtime over maximizing concurrency. If a ticket validates manually but not through the queue worker, compare direct task execution against the async worker pool before blaming the OCR model itself.

## Symptom
- On the Japan Post tenant route, the delivery-preference field was low quality and created noisy UI/output that the user did not want to review.

## Root Cause
- The shared ticket workspace still rendered and saved the delivery-time field for Japan Post even though that tenant’s current demo flow did not need to trust or expose that extraction.

## Fix
- Hid the `配達希望時間帯` block on the Japan Post tenant route.
- Removed the corresponding `DeliveryTimeSlot` overlay box for that tenant and saved an empty value instead of persisting low-confidence output.
- Added a workspace layout regression assertion so the Japan Post ticket page does not render the field again by accident.

## Prevention Rule
- Tenant-specific OCR confidence gaps should be handled in the tenant UI layer, not left as low-signal editable fields. If one field is intentionally out of scope for a demo tenant, hide both its form control and its preview overlay to keep the workflow clean.

## Stepper Workflows Need Persistent Step State

**Date:** 2026-04-19

### Symptom

A staged workflow looked clearer after adding review steps, but moving back to an earlier step reset key user inputs and made the flow feel unreliable.

### Root Cause

The UI changed from a single-pass form into a multi-step workflow, but the intake data still lived inside step-local component state. When the step unmounted, the draft disappeared.

### Fix

Lift step drafts into the app-level workflow state, then let stepper navigation only change the visible stage. Keep secondary editing in floating panels so the main stage can stay summary-first without sacrificing edit access.

### Prevention Rule

When introducing a stepper to an existing flow, treat persistence of each step's draft as a first-class requirement. Navigation should reveal different stages, not destroy the user's in-progress work.

### Example

Prefer:

```tsx
const [intakeDraft, setIntakeDraft] = useState(createEmptyProject().intake)

<ProjectSetup
  intake={intakeDraft}
  onIntakeChange={(field, value) => setIntakeDraft((prev) => ({ ...prev, [field]: value }))}
/>
```

## Floating Panels In Dense Workspaces Should Use Portals

**Date:** 2026-04-19

### Symptom

Quick-edit panels worked functionally, but in a dense stepper workspace they risked feeling visually tied to the wrong section and could be more fragile around stacking, overlay layering, and keyboard focus.

### Root Cause

Rendering floating panels inside the local component subtree makes them inherit that subtree's stacking context and layout constraints. In multi-panel workflows, that can make overlays less predictable and harder to use from the keyboard.

### Fix

Render floating panels through a portal to `document.body`, focus the dialog on open, and keep `Escape` as a first-class close path.

### Prevention Rule

If a UI element is conceptually an app-level overlay rather than an in-flow card, render it as an actual overlay. Dense workspaces especially benefit when floating panels are decoupled from the local layout tree.

### Example

Prefer:

```tsx
return createPortal(
  <div role="dialog" aria-modal="true" tabIndex={-1}>
    ...
  </div>,
  document.body
)
```

## Browser File APIs Need Capability Guards And Fallback Paths

**Date:** 2026-04-19

### Symptom

A browser-based save feature can compile and feel complete, but break or become unreachable in environments where File System Access APIs are missing or partially typed.

### Root Cause

Directly assuming `showDirectoryPicker` exists couples the feature to a subset of browsers and can also trigger TypeScript friction because the DOM type surface is not uniform across environments.

### Fix

Wrap filesystem features behind an explicit capability check, keep the core save path working through app storage, and treat folder export as an enhancement rather than the only persistence route.

### Prevention Rule

For browser persistence features, always separate `required storage` from `enhanced filesystem export`. Capability-detect the enhanced path, type it explicitly, and make sure the main workflow still works without it.

### Example

Prefer:

```ts
const pickerWindow = window as Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}

if (typeof pickerWindow.showDirectoryPicker !== 'function') {
  return false
}
```

## Management Workflows Should Graduate From Popup To Dedicated View

**Date:** 2026-04-19

### Symptom

A lightweight popup worked for the first version of project saving, but once the feature needed search, filters, grid browsing, and richer detail inspection, the overlay format became cramped and harder to scan.

### Root Cause

The interaction scope changed from “quick selection” to “project management.” Keeping that inside a floating panel forced too much navigation, metadata, and imagery into a transient container.

### Fix

Promote the project library into its own top-level app view, keep workspace editing separate, and let the library use a broader page layout with grid browsing and a persistent detail inspector.

### Prevention Rule

When a feature grows from quick access into a multi-step management workflow, do not keep stretching the original popup. Re-evaluate whether it now deserves a full page or dedicated view.

### Example

Prefer:

```tsx
{appView === 'workspace' ? <WorkspaceShell /> : <ProjectLibraryPage />}
```

## Saved Libraries Need Lightweight Management Metadata Separate From Core Content

**Date:** 2026-04-19

### Symptom

Once the project library gained favorites, renaming, sorting, and compare workflows, treating saved project data as only the raw project payload made management features awkward and brittle.

### Root Cause

The core storyboard project model describes creative content, not library behavior. Features like favorites and grid sorting belong to library-facing summary metadata and should not force unrelated storyboard schema changes everywhere.

### Fix

Keep a saved-project summary layer for library management metadata, hydrate missing fields defensively, and only sync the few values that also matter to the workspace, such as `projectName`.

### Prevention Rule

When adding management features to saved entities, do not overload the core content model with every UI concern. Put library-facing state in a summary/adapter layer and hydrate older saved entries safely.

### Example

Prefer:

```ts
interface SavedProjectSummary {
  id: string
  name: string
  isFavorite: boolean
  updatedAt: string
}
```

## Filters And Summary Metrics Should Not Compete In The Same Dense Row

**Date:** 2026-04-19

### Symptom

A library header can become visually confusing when search, filters, sort controls, chips, and large stat cards all share one crowded horizontal band.

### Root Cause

Those elements serve different jobs. Controls are for action, chips are for quick state, and stat cards are for orientation. Mixing them into one dense cluster forces the eye to constantly re-parse the section.

### Fix

Separate the top area into clear layers: first controls, then quick counts, then larger summary stats. Keep labels short and make each row do only one kind of work.

### Prevention Rule

If a screen header starts combining input controls and dashboard metrics, split it before adding more content. Scanability usually improves more from separation than from shrinking typography.

### Example

Prefer:

```tsx
<BrowseControls />
<QuickCountChips />
<LibraryStatsGrid />
```

## Browser Project Libraries Should Not Store Full Image Payloads In localStorage

**Date:** 2026-04-19

### Symptom

Saving a storyboard project failed with a browser quota error as soon as the project library tried to store sessions that contained rendered frames or reference images.

### Root Cause

The project library treated `localStorage` as the primary persistence layer and serialized full project documents there, including large embedded image data URLs. Folder export happened only after that browser storage write succeeded.

### Fix

Switch the project library to a folder-backed source of truth using the File System Access API. Save project JSON and image metadata directly into `storyboard-projects/` on disk, keep only lightweight connection state in the browser, and let the library UI read from the folder index instead of `localStorage`.

### Prevention Rule

If saved entities can contain images or other large payloads, do not use `localStorage` as the main database. Use filesystem or IndexedDB-backed storage for the heavy content, and reserve browser key-value storage for tiny preferences only.

### Example

Prefer:

```ts
const connection = await connectProjectLibraryRoot()
await saveProjectToLibrary(project, { promptForDirectory: false })
```

## Preview UX Needs The Right Interaction Model, Not Just The Right Data

**Date:** 2026-04-19

### Symptom

A new storyboard preview technically exposed the needed scene data, but it still felt too heavy and unlike the intended contact-sheet storyboard reference because it expanded into a second detailed page mode.

### Root Cause

The implementation optimized for completeness instead of the user's actual workflow. The user wanted a quick, glanceable preview overlay for review and handoff, not another dense workspace view with many setup blocks.

### Fix

Replace the inline preview mode with a floating popup contact sheet. Keep each scene card concise: image, short description, and only the most essential setup cues needed for fast scanning.

### Prevention Rule

When a user asks for a "preview", confirm whether they mean a lightweight review surface or a full alternate workspace. For storyboarding and similar visual flows, favor a popup/contact-sheet interaction when the goal is quick overview rather than editing.

### Example

Prefer:

```tsx
<button type="button" onClick={() => setIsPreviewOpen(true)}>
  Preview Board
</button>

{isPreviewOpen && <StoryboardPreview project={project} onClose={() => setIsPreviewOpen(false)} />}
```

## Dense Storyboard Workspaces Need Fewer Sections And Stronger Action Grouping

**Date:** 2026-04-19

### Symptom

The storyboard screen became harder to scan because it stacked multiple large panels for command deck, stats, references, and headings before users even reached the scene cards.

### Root Cause

Useful features were added as separate sections instead of being regrouped around the real primary task: editing and reviewing scenes. This created visual overhead and long scroll before the user reached the main content.

### Fix

Collapse the workflow into a compact sticky stepper, a simplified project pulse, a concise storyboard summary, and a floating action toolbar. Move secondary controls like references into popups, and make `Add Scene` scroll directly to the newly created card.

### Prevention Rule

When a workspace is scene-centric, do not keep adding full-width control sections above the canvas. Prefer one compact summary area and one strong action cluster, then move secondary tasks into overlays.

### Example

Prefer:

```tsx
<FloatingToolbar>
  <ActionButton>Preview Board</ActionButton>
  <ActionButton>References</ActionButton>
  <ActionButton onClick={handleAddSceneAndScroll}>Add Scene</ActionButton>
</FloatingToolbar>
```

## Sticky Utility Rails Must Be Independent Of The Content Flow

**Date:** 2026-04-19

### Symptom

A storyboard action menu looked vertically stacked and technically sticky, but it still felt wrong because it moved with the canvas layout and read like another content card instead of an app-level utility rail.

### Root Cause

The toolbar was rendered inside the storyboard content section and positioned with in-flow sticky layout. That preserved its DOM location as part of the canvas structure, so visually it still belonged to the page content rather than to the app shell.

### Fix

Move the action cluster to a fixed right-side rail that is independent from the storyboard canvas, keep pointer events scoped to the rail itself, and add a regression test that asserts the rail stays `fixed` instead of drifting back to an in-flow `sticky` block.

### Prevention Rule

If a control group is meant to behave like an always-available app utility rail, do not leave it inside the main content flow. Make its placement independent from the editing canvas and lock that behavior with a layout-oriented regression check.

### Example

Prefer:

```tsx
<div data-testid="storyboard-action-rail" className="fixed right-4 top-[180px] z-40">
  <ActionRail />
</div>
```

## Collapsed Icon Rails Must Remove Hidden Label Spacing

**Date:** 2026-04-20

### Symptom

A right-side action rail looked correct in expanded mode, but collapsed icon buttons appeared slightly off-center and the collapse arrow felt visually detached from the left edge of the expanded panel.

### Root Cause

The collapsed action buttons kept the same flex `gap` that was used for the visible label state. Even though the label had zero width and opacity, the gap still occupied space and pushed the icon off-center.

### Fix

Make the action button gap conditional: use `gap-3` only when labels are visible and `gap-0` in collapsed icon-only mode. Align the collapse-arrow row left when expanded and center it when collapsed.

### Prevention Rule

When hiding labels in an icon-only toolbar, remove both label width and label spacing. Verify collapsed controls by checking icon centering, not only by checking that labels are hidden.

### Example

Prefer:

```tsx
className={collapsed ? 'w-11 justify-center gap-0 px-0' : 'w-[190px] justify-start gap-3'}
```

## Textarea Tests Should Set Final Value For Submit-Driven Flows

**Date:** 2026-04-25

### Symptom

A component test for a modal textarea submitted only the first typed character even though the intended user instruction was much longer.

### Root Cause

The test used incremental typing immediately followed by a submit action in a stateful portal/modal flow. The assertion was meant to verify the submitted final value, not keystroke behavior.

### Fix

Use a direct textarea change event for the final value when the test is about submit payload correctness.

### Prevention Rule

When testing submit-driven flows, choose the input simulation that matches the assertion. Use incremental typing for keyboard behavior, and direct change events for final form payloads.

### Example

Prefer:

```tsx
fireEvent.change(textarea, {
  target: { value: 'Final instruction text.' },
})
```

## Supplier Is The Primary Product Submission Actor

**Date:** 2026-05-16

### Symptom

The product image upload spec initially treated `ADMIN` and `PRODUCT_MANAGER` as the first implementation actors and put `SUPPLIER` upload into a future portal phase.

### Root Cause

The original procurement spec describes suppliers as the source of product submission, including images and proposal materials. I inferred from the current MVP UI/admin routes instead of re-checking the business actor ownership in the source spec.

### Fix

Update the image upload spec and implementation so `SUPPLIER` can create/update/upload images for own products only, while admin/product manager retain governance access. Scope supplier list views to own product/supplier data.

### Prevention Rule

For any feature touching product registration, supplier materials, images, attachments, or change requests, verify the source business actor in `req/system_spec_product_proposal_procurement.md` before assigning API roles or UI ownership.

### Example

Prefer:

```ts
if (user.role === 'SUPPLIER') {
  assert(product.supplierId === user.supplierId)
}
```
