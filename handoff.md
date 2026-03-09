# FretboardTrainer Handoff

## Purpose

This file is a practical handoff for continuing the current work on another
computer.

Important: the Codex/Desktop `session_id` alone is not enough to restore this
conversation on a different machine. The reliable path is:

1. Move the code with `git` or by copying the project folder.
2. Open the project on the other computer.
3. Paste the starter prompt from the bottom of this file into a new session.

## Project Location

Current local path:

- `C:\Users\pavel\Documents\Playground\FretboardTrainer`

Repository:

- `https://github.com/shafranek-js/FretboardTrainer`

## What To Transfer

Minimum:

- the repository working tree

Recommended:

- commit or push current changes first, then pull them on the other computer

Not recommended as a primary method:

- trying to restore only from Codex local session files or `session_id`

## Local Run Commands

From the project root:

```powershell
npm install
npm run lint
npm run build
npm run dev
```

If Vite port `3000` is busy, it may move to `3001`.

## Current Refactor Goal

We are doing an incremental refactor of
`src/controllers/session-controller.ts` toward a composition-root style
architecture.

The rule has been:

- extract one cohesive controller at a time
- keep behavior unchanged
- verify after each step with targeted tests, `lint`, and `build`

The detailed roadmap lives in:

- `refactor.md`

## What Has Already Been Extracted

These controllers were already split out from `session-controller.ts`:

- `workflow-layout-controller.ts`
- `workflow-layout-controls-controller.ts`
- `melody-import-controls-controller.ts`
- `melody-editing-controls-controller.ts`
- `melody-playback-controls-controller.ts`
- `melody-library-controls-controller.ts`
- `practice-preset-controls-controller.ts`
- `practice-setup-controls-controller.ts`
- `metronome-controls-controller.ts`
- `instrument-display-controls-controller.ts`
- `melody-setup-controls-controller.ts`
- `melody-practice-controls-controller.ts`
- `session-transport-controls-controller.ts`
- `audio-input-controls-controller.ts`
- `melody-tempo-controller.ts`
- `session-bootstrap-controller.ts`
- `practice-preset-ui-controller.ts`
- `melody-demo-runtime-controller.ts`

## Most Recent Change

The most recent structural change was:

- extracting melody demo runtime orchestration from
  `src/controllers/session-controller.ts`
- creating `src/controllers/melody-demo-runtime-controller.ts`
- adding coverage in
  `src/controllers/melody-demo-runtime-controller.test.ts`

That controller now owns:

- demo playback selection guards
- coupling between `melody-demo-controller` and
  `melody-demo-presentation-controller`
- metronome sync on playback start, pause, stop, and resume
- timeline scroll reset and runtime cursor updates
- `findPlayableStringForNote`

## Latest Verification Status

These checks passed after the latest change:

- `npm run lint`
- `npm run build`
- `npm run test -- src/controllers/melody-demo-runtime-controller.test.ts src/controllers/melody-demo-controller.test.ts src/controllers/melody-demo-presentation-controller.test.ts src/controllers/melody-playback-controls-controller.test.ts src/controllers/melody-setup-controls-controller.test.ts src/controllers/session-bootstrap-controller.test.ts`

Focused result:

- 6 test files passed
- 28 tests passed

## Suggested Next Step

Best next move:

- continue shrinking `src/controllers/session-controller.ts`

Two reasonable options:

1. Remove the remaining thin orchestration/helper adapters so the file becomes
   an even cleaner composition root.
2. Start the next roadmap phase and move the extracted controllers into domain
   folders, for example `src/controllers/workflow/`, `src/controllers/melody/`,
   `src/controllers/session/`, `src/controllers/audio/`.

Recommended next step:

- option 1 first, then folder reorganization after the boundaries are fully
  stable

## Notes About The Environment

Useful local observations from this machine:

- `vitest` in the sandbox needed elevated execution because of `spawn EPERM`
- `lint` and `build` ran fine normally
- `git` commands from the sandbox hit a safe-directory ownership warning, so
  git status/branch inspection from this environment was limited

That means on another normal local machine you should prefer using your own
regular shell for `git`, `npm run test`, and development.

## Starter Prompt For A New Session

Paste this into a new Codex session on the other computer:

```text
Continue work on FretboardTrainer in this repository.

First read:
1. handoff.md
2. refactor.md

Context:
- We are in the middle of an incremental refactor of src/controllers/session-controller.ts.
- The latest completed step extracted melody demo runtime orchestration into src/controllers/melody-demo-runtime-controller.ts.
- Keep behavior unchanged and continue with small safe extractions.
- After each meaningful step, verify with targeted tests plus npm run lint and npm run build.
- Do not revert unrelated user changes.

Please inspect the current codebase, confirm the current state, and continue with the next best refactor step.
```
