# tasks/todo.md

*Last updated: 2026-02-28*

# Project Task Plan

## 1. Goal

Eliminate remaining input typing lag/jitter by removing background state overwrite and aggressive auto-refresh interactions while editing.

## 2. Constraints

-   Technical constraints: Keep current admin page architecture and API contracts.
-   Business constraints: Editing experience must be smooth without losing validation safety.
-   Timeline: Immediate hotfix.

## 3. Plan

-   [x] Step 1: Identify non-input causes of lag (polling/state sync/fetch-on-change).
-   [x] Step 2: Add dirty-form guard to prevent form overwrite during typing.
-   [x] Step 3: Remove expensive auto-fetch triggers from limit fields while typing.
-   [x] Step 4: Rebuild and verify no numeric coercion handlers remain.

## 4. Risks

-   Risk 1: With dirty guard enabled, monitor updates may pause while user is editing.
-   Risk 2: Removing auto-fetch-on-change means some lists refresh on blur/button instead of every keystroke.

## 5. Verification Strategy

-   How to test: Build FE/BE, confirm no `Number(e.target.value)`/`clampInt(Number(...))` in admin handlers, verify polling pauses while life form is dirty.
-   Expected outcome: Typing stays stable and responsive; no mid-typing overwrite; validations remain enforced at save/run.

------------------------------------------------------------------------

# Implementation Log
