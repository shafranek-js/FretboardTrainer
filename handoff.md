# FretboardTrainer Handoff

## Purpose

This file is the current handoff for continuing work on another machine or in a new Codex session.

The reliable recovery path is still:

1. Pull the repository.
2. Read `handoff.md`.
3. Read `refactor.md`.
4. Continue from the latest pushed state on `main`.

Do not rely on Desktop session history alone.

## Project Location

Current local path:

- `C:\Projects\FretboardTrainer`

Repository:

- `https://github.com/shafranek-js/FretboardTrainer`

## Current Product State

The app is currently organized around these workflows:

- `Learn Notes`
- `Study Melody`
- `Practice`
- `Perform`
- `Library`
- `Editor`

Recent product-level work that is already in `main`:

- workflow-first top toolbar and panel layout
- `Study Melody -> Practice -> Perform` split
- dedicated `Library` vs `Editor` behavior
- bottom `Status Bar`
- metronome refactor with audio-clock lookahead scheduling
- `Study Melody` repeated-note hardening (`same note -> same note`)
- persisted workflow restore across reload
- persisted `Show String Buttons` visibility across reload in `Learn Notes`

## Current Refactor Goal

The active architectural goal is still the incremental refactor of:

- `src/controllers/session-controller.ts`

Target shape:

- thinner composition root
- more explicit controller ownership
- fewer hidden side-effects in mode/runtime modules

Detailed roadmap:

- `refactor.md`

## What Has Already Been Improved Structurally

Significant completed changes already in `main`:

- extracted multiple focused controllers from `session-controller.ts`
- introduced `workflow-controller.ts`
- moved `MelodyPracticeMode` away from unsafe prompt mutation
- removed `state.currentMelodyEventIndex++` from `generatePrompt()`
- removed direct BPM reads from DOM in melody mode generation
- moved melody mode start validation into preflight
- removed `currentMelodyEventFoundNotes.clear()` from melody prompt generators
- persisted `uiWorkflow` in settings/profiles
- hardened workflow restore so `Library` / `Editor` do not collapse back into `Study Melody` on reload

## Most Recent Pushed Commits

Latest relevant commits on `main`:

- `4c804f4` — `Preserve workflow and string button state on reload`
- `3df4cb1` — `Improve melody playback retiming and harden metronome scheduling`
- `26e66b1` — `Harden study melody repeated-note detection`
- `9be54be` — `Fix study melody prompt tracking and timeline highlight`
- `de81293` — `Fix unit test regressions after melody refactor`

## What The Latest Fix (`4c804f4`) Actually Changed

This commit fixed reload persistence around workflow state and Learn Notes string buttons.

Files involved:

- `src/storage.ts`
- `src/storage-profiles.ts`
- `src/ui.ts`
- `src/ui-signals.ts`
- `src/controllers/practice-setup-controls-controller.ts`
- `src/controllers/workflow-layout-controller.ts`
- `src/storage.test.ts`
- `e2e/helpers/app-shell.ts`
- `e2e/app-smoke.spec.ts`

Important behavior now expected:

1. `Practice -> reload` stays in `Practice`.
2. `Library -> reload` stays in `Library`.
3. `Editor -> reload` stays in `Editor`.
4. In `Learn Notes`, if `Training Focus = random` and `Show String Buttons` is enabled, the fretboard string buttons stay visible after reload.

## Latest Verification Status

Latest pushed state (`4c804f4`) was verified with:

- `npm run typecheck`
- `npm run test:e2e -- e2e/app-smoke.spec.ts`

GitHub Actions after push:

- `CI Smoke / test-and-smoke` — success
- `Deploy To GitHub Pages` — success

The new smoke coverage now includes a regression for:

- `Learn Notes`
- `Training Focus = random`
- `Layout -> Show String Buttons`
- reload
- string buttons still visible after reload

## Known Environment Constraints

On this machine / sandbox:

- `vitest` sometimes fails to start with `spawn EPERM`
- `playwright` is usually fine through `npm run test:e2e`, but targeted runs may still hit environment-specific issues occasionally
- `typecheck` has been the most reliable local gate
- GitHub Actions has been the final source of truth after push

Practical rule:

1. Run `npm run typecheck` locally.
2. Run `npm run test:e2e -- e2e/app-smoke.spec.ts` locally.
3. After every push, check `CI Smoke / test-and-smoke` on GitHub.

## Local Run Commands

From project root:

```powershell
npm install
npm run typecheck
npm run test:e2e -- e2e/app-smoke.spec.ts
npm run dev
```

If port `3000` is occupied, restart dev server explicitly.

## Current Working Tree Notes

At the moment this handoff was updated:

- `main` is clean for tracked files
- there are still unrelated untracked local artifacts that should not be committed automatically:
  - `.orchids/`
  - `Automated Guitar Fingering Algorithms.md`
  - `Automated Guitar Fingering Algorithms.pdf`
  - `bun.lock`
  - `fretflow-session-analysis-latest.json`
  - `tmp/`
  - `x2scrap.png`

## Best Next Step

Best next engineering move:

1. Continue shrinking `src/controllers/session-controller.ts`.
2. Prefer small bridge/orchestration extractions.
3. Do not start a broad `state.ts` rewrite and `logic.ts` rewrite in the same step.

Recommended immediate direction:

- keep following `refactor.md`
- focus on remaining thin orchestration/helpers around session/workflow wiring
- keep each refactor step behavior-preserving and small

## Starter Prompt For A New Session

Use this in a new Codex session:

```text
Continue work on FretboardTrainer in this repository.

First read:
1. handoff.md
2. refactor.md

Current state:
- The app already uses workflow-first UI (`Learn Notes`, `Study Melody`, `Practice`, `Perform`, `Library`, `Editor`).
- Recent pushed work includes metronome audio-clock scheduling, Study Melody repeated-note hardening, and reload persistence for workflows and Learn Notes string buttons.
- The latest pushed commit is `4c804f4` (`Preserve workflow and string button state on reload`).
- The active architectural goal remains shrinking `src/controllers/session-controller.ts` incrementally.

Rules:
- Keep behavior unchanged unless explicitly fixing a confirmed bug.
- Prefer small extractions over broad rewrites.
- After each meaningful step, verify with `npm run typecheck` and `npm run test:e2e -- e2e/app-smoke.spec.ts`.
- After each push, check GitHub `CI Smoke / test-and-smoke`.
- Do not revert unrelated user changes.

Please inspect the current codebase, confirm the current state, and continue with the next best small refactor or bugfix step.
```

## Status Update (2026-03-12, post-runtime graph pass)

The current local tree is materially ahead of the older handoff sections above.

### Current architecture snapshot

- `src/logic.ts` is now a graph-based runtime composition root at roughly 641 lines.
- `src/ui-signals.ts` is now a thin facade at roughly 15 lines.
- `src/controllers/session-controller.ts` is again the main remaining controller-layer hotspot at roughly 1131 lines.
- Runtime composition is now split through graph + dep-builder layers:
  - `session-performance-feedback-graph-cluster` + `session-performance-feedback-graph-deps`
  - `session-prompt-performance-runtime-graph-cluster` + `session-prompt-performance-runtime-graph-deps`
  - `session-detection-runtime-graph-cluster` + `session-detection-runtime-graph-deps`
  - `session-lifecycle-runtime-graph-cluster` + `session-lifecycle-runtime-graph-deps`
  - `session-audio-runtime-graph-cluster` + `session-audio-runtime-graph-deps`

### Verification rule on this machine

For local verification in this environment:

1. Run `npm run typecheck`.
2. Run targeted `npm run test -- ...` suites outside the sandbox.
3. Do not rely on sandboxed Vitest here; this machine consistently hits `spawn EPERM` for Vitest in the sandbox.

### Best next step from the current tree

The next best engineering move is now:

1. Return to `src/controllers/session-controller.ts`.
2. Continue only with behavior-preserving composition cleanup.
3. Prefer dep-builder extraction for large controller graph literals over introducing more thin bridge layers.

### Updated starter prompt note

If starting a new session, update the old starter prompt mentally with this correction:

- `logic.ts` is no longer the main hotspot.
- `session-controller.ts` is again the main remaining orchestration hotspot.
- Use `npm run typecheck` plus targeted `npm run test -- ...` suites for verification.
