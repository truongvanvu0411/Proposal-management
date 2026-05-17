# Delivery Time Template2 Conservative Tuning

*Date: 2026-04-04*

## Goal

Improve `配達希望時間帯` on the Yuupack `Test data` and `Training data` sets so the runtime prefers correct detections, and returns blank when the mark is not stable enough to trust.

## Constraints

- Keep the current ticket OCR API contract unchanged.
- Limit blast radius to delivery-time decision logic.
- Do not introduce a new user-facing training flow in this change.
- Prefer abstain-to-blank over false positives.
- Keep the already-good marked/test-family behavior stable while rescuing the legacy training-family images.

## Approach

1. Replay the full Yuupack `Test data` and `Training data` sets through the live detector paths (`static`, `refined`, `inferred`, shifted rescues).
2. Tighten the `template2` chooser in three places:
   - block `morning` rescue unless the shifted search produces a real support cluster instead of a single lucky ROI,
   - keep strong `static` late-slot predictions when `refined` conflicts but the inferred path is weak,
   - abstain when `static` and `refined` agree on a positive label but that consensus is unstable and unsupported by the inferred path.
3. Add a narrow shadow-detector fallback for the legacy training-family mistakes:
   - only allow the shadow model to override when the live detector is in one of a few known false-positive patterns (`14_16`, weak `none`, low-confidence `19_21`, low-confidence `18_20`, or a rare `morning` vs `12_14` conflict),
   - keep the live detector as the default path for the marked/test family where it is already more reliable.
4. Re-run the full datasets and verify the new behavior favors precision and blank-on-uncertainty.

## Risks

- Some previously filled delivery-time values may become blank.
- Tightening `morning` rescue can reduce recall on edge cases that relied on a single shifted ROI.
- Additional template2 heuristics can drift if later data belongs to a different layout family.
- A shadow fallback can become dangerous if it is allowed to override broad classes of predictions instead of only the known conflict patterns.

## Verification

- Run AI regression tests for delivery-time layout heuristics.
- Replay the full Yuupack `Training data` and `Test data` sets against the local OCR lane.
- Compare before/after and confirm that wrong high-confidence guesses drop, especially on `template2`.
- Success target for this pass:
  - `Training data`: recover the known `14_16` and weak-abstain false positives using the shadow fallback.
  - `Test data`: keep `0` wrong non-blank predictions, even if a few cases stay blank.
