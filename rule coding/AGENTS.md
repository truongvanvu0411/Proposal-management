# AGENTS.md

*Last updated: 2026-02-28*

# AI-Agent Coding & Workflow Rules

## 0. Definitions

-   Non-trivial task = ≥3 implementation steps OR
    architectural/schema/API change OR regression risk.
-   Done = Tests/build pass + acceptance criteria met + no unintended
    breaking changes.

------------------------------------------------------------------------

## 1. Workflow Orchestration

### Mandatory Compliance

-   These rules are mandatory for every future task.
-   The agent MUST follow this file before implementation, during implementation, and before marking done.
-   If any required step is missing, the agent MUST backfill it before closing the task.

### Plan Mode

-   MUST create a plan for non-trivial tasks.
-   Plan format: Goal → Constraints → Approach → Risks → Verification.
-   STOP and re-plan if unexpected issues appear.

### Subagent Strategy

-   SHOULD delegate research, large code scanning, log analysis.
-   One objective per subagent.
-   MUST consolidate final decision.

### Self-Improvement Loop

-   After corrections, update `tasks/lessons.md`:
    -   Symptom
    -   Root Cause
    -   Fix
    -   Prevention Rule
    -   Example

### Verification Before Done

-   NEVER mark done without proof.
-   Provide:
    -   Passing tests OR
    -   Reproduction steps OR
    -   Logs/metrics validation
-   Compare behavior before/after if relevant.

### Elegant Solutions

-   Prefer simple, minimal-impact changes.
-   Avoid over-engineering.
-   Replace hacky solutions if better architecture is clear.

### Autonomous Bug Fixing

-   Reproduce bug or identify clear evidence.
-   Fix root cause.
-   Add regression test when applicable.

------------------------------------------------------------------------

## 2. Engineering Standards

### Simplicity First

-   Keep solutions minimal.
-   Limit blast radius.

### Security

-   NEVER hardcode secrets.
-   Validate all external input.
-   Mask sensitive data in logs.

### Testing

-   Non-trivial change MUST include tests.
-   Bug fixes SHOULD include regression tests.

### API & Schema

-   Preserve backward compatibility unless explicitly breaking.
-   Provide migration plan when needed.

### Documentation

-   Update README/docs for public behavior changes.
