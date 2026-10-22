# CreatorDeck Autonomy Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect and diagnose persistent failures cheaply, prepare safe incident recovery, strengthen Android validation, and ensure APK releases require successful verification of the same main revision.

**Architecture:** Reuse the current local quality runner and reports. Add deterministic retry/deduplication and a compact incident packet; never act on transient or repeated incidents. Improve the APK workflow gate and the emulator smoke path. Preserve opt-in local diagnostics without adding remote data collection or an unsafe self-hosted runner.

**Tech Stack:** Node.js built-in test runner, GitHub Actions YAML, Playwright, Android SDK/ADB, PowerShell Scheduled Tasks.

**Spec:** `docs/superpowers/specs/2026-10-19-autonomie-phase-2.md`

## Global Constraints

- Successful tests make no AI calls.
- A persistent new incident gets one bounded, isolated recovery attempt at most; no push or production deployment.
- The active checkout and its pre-existing changes remain untouched by recovery automation.
- No PR code executes on a personal self-hosted runner.
- No personal or game-content telemetry leaves the device.
- APK publication requires a successful `main` push verification for the exact SHA.

## Review Focus

- A failed first run that passes on retry is marked transient and does not trigger AI.
- The same incident/SHA does not trigger repeated recovery or notifications.
- Codex cannot read inherited secrets or write outside the isolated recovery directory.
- Manual APK dispatch on a branch or an unverified SHA is denied.
- Android startup timeout produces a useful failure report and never captures a false-ready splash as a passing app.

---

### Task 1: Gate APK release provenance

**Files:**
- Create: `scripts/apk-release-gate.mjs`
- Create: `scripts/apk-release-gate.test.mjs`
- Modify: `.github/workflows/apk.yml`

**Interface:** `evaluateApkRelease({ eventName, ref, sha, repository, payload, verificationRuns }) -> { allowed, reason }`.

- [x] Test automatic releases for successful same-repo `main` push only.
- [x] Test denial for manual dispatch and mismatched/non-main/unverified provenance.
- [x] Run the gate test red, then implement the local provenance guard (3/3 green).
- [x] Remove `workflow_dispatch`; gate the APK job on the completed same-SHA verified main push.
- [x] Parse both workflow YAML files locally with `js-yaml`; real GitHub Actions execution remains unvalidated.

### Task 2: Detect, retry, deduplicate, and package local incidents

**Files:**
- Create: `scripts/lib/quality-incidents.mjs`
- Create: `scripts/quality-incidents.test.mjs`
- Modify: `scripts/mobile-quality.mjs`
- Modify: `scripts/lib/mobile-quality-report.mjs`
- Modify: `package.json`

**Interface:** incident store keyed by SHA and normalized failing stage/spec; one retry; classifications `passed`, `transient`, `confirmed-new`, `confirmed-duplicate`; a compact resume packet contains no raw secret or full log.

- [x] Add behavioral tests for transient recovery, persistent failure, duplicate suppression, and sanitized packet creation.
- [x] Run the incident tests red, then implement retry and incident persistence.
- [x] Add retry and preserve first-attempt Playwright evidence before a retry.
- [x] Create a read-only Codex resume command only for a new confirmed incident; tests prove no model call.
- [x] Rerun autonomy/incident/mobile-report tests as part of `npm run test:autonomy` (14/14).

### Task 3: Add failure-only GitHub diagnostics

**Files:**
- Create: `scripts/ci-incident-report.mjs`
- Create: `scripts/ci-incident-report.test.mjs`
- Modify: `.github/workflows/verification.yml`

- [x] Test a deterministic report from failed job results and verify success creates no incident.
- [x] Run tests red, then implement a final failure-only job and short-lived structured report artifact.
- [x] Test report generator and inspect workflow permissions/artifact retention locally; GitHub execution remains unvalidated.

### Task 4: Wait for Android readiness and test an interaction/update path

**Files:**
- Modify: `scripts/android-emulator-smoke.mjs`
- Create: `scripts/android-emulator-smoke.test.mjs`
- Modify: `package.json` only if an explicit Android test command is needed.

- [x] Test readiness success and timeout details with a controlled probe (2 tests).
- [x] Add bounded readiness polling and navigation interaction checks before capture.
- [x] Keep the two-APK install/update assertion and report readiness wait/fingerprinted save evidence.
- [x] Emulator scenario attempted on the installed AVD; startup then activity launch caused the emulator to disappear from ADB. Failure reports/logs and preserved AVD state are recorded; update/save-preservation check remains unverified.

### Task 5: Make recovery and operator state explicit

**Files:**
- Modify: `docs/qualite-autonome.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/agent-handoff.md`
- Modify: `docs/decisions.md` if a durable policy changes.

- [x] Record runner/task/CLI limits, recovery boundaries, phone diagnostic privacy, and exact local verification.
- [x] Run full suite (1,301/1,301), autonomy suite (14/14), typecheck, targeted ESLint, syntax/YAML checks, production build, mobile runner manually and via scheduled task (7/7 each); accurately record Android failure.
- [ ] Stage/commit/publish only after remote SHA verification; GitHub DNS is unavailable in this session.

## Delivery boundaries

Installing a self-hosted runner, creating remote diagnostics storage, publishing migrations, making an actual AI call for a fixture, or deploying a new APK is excluded unless the required safety and validation conditions are demonstrated. Do not represent those as operational when blocked.
