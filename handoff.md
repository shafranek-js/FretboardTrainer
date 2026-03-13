# FretboardTrainer Handoff

## Purpose

This is the current handoff for resuming work in a new Codex session or on another machine.

Reliable recovery path:

1. Pull the repository.
2. Read `handoff.md`.
3. Read `refactor.md`.
4. Run `git status` before making changes.

Do not rely on chat history alone.

## Project Location

- Local path: `C:\Projects\FretboardTrainer`
- Repository: `https://github.com/shafranek-js/FretboardTrainer`

## Current Product Baseline

The product is already organized around these workflows:

- `Learn Notes`
- `Study Melody`
- `Practice`
- `Perform`
- `Library`
- `Editor`

That workflow-first structure should be treated as the current product baseline, not an experiment.

## Latest Pushed State

Latest pushed commit known from this machine:

- `09e7dc6` — `Fix dom mocking in unit tests`

That pushed state already had green CI and a successful GitHub Pages deploy.

## Current Local State (Ahead Of Push)

The local working tree is ahead of `origin/main` in controller-layer refactoring. Those code changes are currently local and not committed yet.

### Main local architectural progress

`src/controllers/session-controller.ts` has been reduced significantly and is now around `661` lines.

The latest local pass moved large portions of controller composition onto graph/cluster seams:

- `session-configuration-graph-cluster`
- `session-configuration-graph-deps`
- `session-editor-bootstrap-graph-cluster`
- `session-editor-bootstrap-graph-deps`

The current local tree now routes major controller composition through these graph layers instead of keeping giant inline wiring blocks in `session-controller.ts`.

### Current hotspot sizes

At the time this handoff was updated:

- `src/controllers/session-controller.ts` — about `661` lines
- `src/logic.ts` — about `641` lines
- `src/ui-signals.ts` — about `15` lines

Interpretation:

- `ui-signals.ts` is no longer a hotspot.
- `logic.ts` and `session-controller.ts` are now the two remaining major composition roots.
- `session-controller.ts` is still the most active controller-layer refactor target.

## What Was Verified Locally In The Current Tree

These checks passed after the latest local `session-controller` refactor pass:

- `npm run typecheck`
- `npm run test -- src/controllers/session-editor-bootstrap-graph-cluster.test.ts src/controllers/session-editor-graph-cluster.test.ts src/controllers/session-bootstrap-graph-cluster.test.ts src/controllers/session-bootstrap-controller.test.ts src/controllers/melody-editing-controls-controller.test.ts src/controllers/melody-playback-controls-controller.test.ts src/controllers/melody-library-controls-controller.test.ts src/controllers/practice-preset-controls-controller.test.ts src/controllers/practice-setup-controls-controller.test.ts src/controllers/instrument-display-controls-controller.test.ts`
- `npm run test -- src/controllers/session-metronome-cluster.test.ts src/controllers/metronome-bridge-controller.test.ts src/controllers/metronome-controls-controller.test.ts src/controllers/metronome-controller.test.ts src/controllers/melody-tempo-controller.test.ts src/controllers/session-editor-bootstrap-graph-cluster.test.ts src/controllers/session-editor-graph-cluster.test.ts src/controllers/session-bootstrap-graph-cluster.test.ts src/controllers/session-bootstrap-controller.test.ts src/controllers/session-transport-controls-controller.test.ts`
- `npm run test -- src/controllers/session-curriculum-preset-cluster.test.ts src/controllers/curriculum-preset-bridge-controller.test.ts src/controllers/curriculum-preset-controller.test.ts src/controllers/practice-setup-controls-controller.test.ts src/controllers/instrument-display-controls-controller.test.ts src/controllers/session-bootstrap-controller.test.ts`
- `npm run test -- src/controllers/session-configuration-graph-cluster.test.ts src/controllers/session-metronome-cluster.test.ts src/controllers/session-curriculum-preset-cluster.test.ts src/controllers/session-input-controls-cluster.test.ts src/controllers/session-workspace-graph-cluster.test.ts src/controllers/session-workflow-layout-cluster.test.ts src/controllers/session-melody-workflow-cluster.test.ts src/controllers/session-practice-controls-cluster.test.ts src/controllers/melody-setup-controls-controller.test.ts src/controllers/melody-selection-controller.test.ts src/controllers/practice-preset-controls-controller.test.ts src/controllers/practice-setup-controls-controller.test.ts src/controllers/instrument-display-controls-controller.test.ts src/controllers/input-device-controller.test.ts src/controllers/mic-settings-controller.test.ts src/controllers/audio-input-controls-controller.test.ts src/controllers/session-transport-controls-controller.test.ts src/controllers/session-editor-bootstrap-graph-cluster.test.ts src/controllers/session-bootstrap-controller.test.ts`

Important environment rule on this machine:

- run `npm run test -- ...` outside the sandbox
- sandboxed Vitest is not reliable here because it consistently hits `spawn EPERM`

## Current Refactor Direction

The architectural goal is still behavior-preserving composition cleanup, not a product rewrite.

### What is already true now

- `logic.ts` is already graph-oriented and much thinner than before.
- `ui-signals.ts` is already a thin facade.
- `session-controller.ts` is flatter than before, but it is still the main controller-layer composition root.

### Best next step from the current tree

Recommended order:

1. Continue shrinking the upper runtime seam in `src/controllers/session-controller.ts`.
2. Prefer migrating that remaining seam onto `session-melody-runtime-graph-cluster`.
3. Only after that, evaluate whether it is worth routing the top-level `selectedMelodyContext + import/editor + configuration graph` wiring through `session-controller-graph-cluster` directly.

### What not to do next

Do not:

- start a broad `state.ts` rewrite
- restart a broad `logic.ts` rewrite
- mix product behavior changes into the next refactor pass
- revert unrelated user file changes in docs or local artifacts

## Current Working Tree Notes

At the moment this file was updated, the working tree included unrelated user-side changes and local artifacts that should not be reverted automatically.

Tracked but unrelated modified files:

- `README.md`
- `TODO.md`
- `IMPROVEMENTS_TODO.md`

Tracked refactor/code file currently modified:

- `src/controllers/session-controller.ts`

Untracked local artifacts still present:

- `.orchids/`
- `Automated Guitar Fingering Algorithms.md`
- `Automated Guitar Fingering Algorithms.pdf`
- `bun.lock`
- `fretflow-session-analysis-latest.json`
- `tmp/`
- `x2scrap.png`

## Practical Resume Checklist

If resuming from this handoff:

1. Run `git status`.
2. Read `handoff.md` and `refactor.md`.
3. Inspect `src/controllers/session-controller.ts` around:
   - `sessionConfigurationGraphDeps`
   - `createSessionConfigurationGraphCluster(...)`
   - `createSessionEditorBootstrapGraphCluster(...)`
4. Continue with the next behavior-preserving cluster extraction.
5. After each step, run `npm run typecheck` and the smallest relevant `npm run test -- ...` suite outside the sandbox.

## Starter Prompt For A New Session

Use this in a new Codex session:

```text
Continue work on FretboardTrainer in this repository.

First read:
1. handoff.md
2. refactor.md

Current local state:
- The latest pushed commit is 09e7dc6 (`Fix dom mocking in unit tests`).
- The local tree is ahead of push in refactoring `src/controllers/session-controller.ts`.
- `src/controllers/session-controller.ts` is around 661 lines.
- `src/logic.ts` is around 641 lines.
- `src/ui-signals.ts` is around 15 lines.
- `session-controller.ts` already routes large sections through `session-configuration-graph-cluster` and `session-editor-bootstrap-graph-cluster`.

Rules:
- Keep behavior unchanged unless fixing a confirmed bug.
- Prefer composition cleanup and graph/cluster transitions over new helper noise.
- Run `npm run typecheck` after each meaningful step.
- Run `npm run test -- ...` outside the sandbox on this machine because sandboxed Vitest hits `spawn EPERM`.
- Do not revert unrelated user changes in README/TODO/IMPROVEMENTS_TODO or local artifacts.

Please inspect the current tree and continue with the next best behavior-preserving refactor step.
```


## Superseding Update (2026-03-13, final local stabilization)

This update supersedes the earlier handoff guidance that suggested continuing the same controller-thinning pass.

### Current local state now

- the local tree is ahead of `origin/main` in a largely completed behavior-preserving refactor
- the main controller/runtime paths now rely on graph/deps/context seams and narrower state contracts
- the remaining work is no longer "keep shrinking the big file"; it is selective maintenance-level review only if justified

### Resume recommendation now

1. Read `handoff.md` and `refactor.md`.
2. Assume the current refactor phase is complete unless a new task exposes a concrete seam problem.
3. Prefer feature work or bug fixing over additional mechanical cleanup.
4. Treat physical folder restructuring as a separate future phase.

### Verification rule remains the same on this machine

- run `npm run typecheck`
- run targeted `npm run test -- ...` outside the sandbox
- sandboxed Vitest is still expected to fail with `spawn EPERM`