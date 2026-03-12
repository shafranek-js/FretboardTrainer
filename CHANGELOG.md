# Changelog

## 2026-03-10

### Product and Workflow UX

- Shipped workflow-first practice surfaces:
  - `Learn Notes`
  - `Study Melody`
  - `Practice`
  - `Perform`
  - `Library`
  - `Editor`
- Split melody learning into a clear ladder:
  - `Study Melody` for note-by-note learning
  - `Practice` for continuous drill runs
  - `Perform` for the final scored run
- Separated `Library` and `Editor` so browsing/export and melody authoring are no longer mixed.
- Moved status, prompt/result, and session info messaging into a bottom `Status Bar`.
- Reworked top controls into a workflow-first toolbar and removed several legacy top-bar/session-area behaviors.

### Audio, Timing, and Runtime

- Added dynamic melody-preview retiming so live BPM changes affect already-running melody playback.
- Rebuilt the metronome around audio-clock lookahead scheduling.
- Replaced per-tick oscillator construction with cached click buffers.
- Aligned visual metronome pulse timing with scheduled audio beats.
- Added meter-aware preroll tick cues for `Practice` and `Perform`.
- Hardened `Study Melody` repeated-note detection so identical adjacent notes require a fresh post-silence attack.
- Improved `Study Melody` prompt tracking so the TAB timeline highlight follows the current target note rather than the previous one.

### Persistence and Reload Behavior

- Persisted `uiWorkflow` across reload and restored workflow-specific layout more reliably.
- Fixed reload persistence for `Learn Notes -> Show String Buttons`.
- Hardened restore so `Library` / `Editor` do not collapse back into `Study Melody` after reload.

### Architecture and Refactor

- Introduced `workflow-controller.ts` and continued shrinking `src/controllers/session-controller.ts`.
- Removed prompt index mutation from `MelodyPracticeMode.generatePrompt()`.
- Removed direct DOM BPM reads from melody-mode prompt generation.
- Moved melody session start validation into preflight.
- Removed `currentMelodyEventFoundNotes.clear()` side effects from melody prompt generators.

## 2026-02-21

### Architecture and UI

- Split startup/event wiring into focused controllers (`session`, `profiles`, `modals`, `resize`).
- Introduced reactive UI layer (`src/ui-signals.ts`) and moved major UI updates to signals:
  - status, prompt/result, timer/score/info slots
  - session button states
  - tuner visibility + tuner reading
  - loading overlay
  - calibration modal/progress/status
  - settings/stats/guide/links/profileName modal visibility
  - profile action button states
  - stats modal data rendering
  - audio meter
- Extracted mode-control visibility mapping into pure `src/training-mode-ui.ts` with tests.

### Fretboard Rendering

- Added renderer-agnostic fretboard render plan model + tests.
- Migrated fretboard rendering to SVG-only path.
- Removed legacy Canvas fallback.
- Extracted shared fretboard helpers:
  - enabled-string and fret-range helpers
  - layout geometry
  - string-label positioning

### DSP and Audio

- Replaced baseline monophonic pitch detection with YIN-based detector.
- Improved polyphonic chord detection robustness path.
- Extracted prompt note target-resolution and fretted-frequency math from `src/logic.ts` into `src/prompt-audio.ts` with unit tests.
- Extracted frame-level audio processing decisions from `src/logic.ts` into pure `src/audio-frame-processing.ts` (`rms`, calibration acceptance/progress, mono/poly stability analysis) with tests.
- Added `src/audio-detection-handlers.ts` orchestration layer (silence gate and mono/poly/calibration wrappers) and routed `processAudio` through it.
- Added `src/prompt-audio-plan.ts` and moved prompt-audio orchestration out of `configurePromptAudio` into a tested builder.
- Added `src/session-result.ts` for success info-slot and timed-score calculations, with tests.
- Added `src/prompt-tracking-state.ts` reset-state factories and reused them in `processAudio`, `startListening`, `stopListening`, and `nextPrompt`.
- Added `src/session-start-preflight.ts` and moved `startListening` preflight branching (timed/progression/arpeggio/button defaults) into a tested plan builder.
- Added `src/audio-runtime.ts` to centralize WebAudio runtime lifecycle (context/analyser/media-stream setup and teardown), and wired `startListening`/`stopListening` through it.
- Added `src/session-success-plan.ts` and moved `displayResult` success flow branching (`arpeggio`, `timed`, `standard`) into a tested plan builder.
- Added `src/session-next-prompt-plan.ts` and moved `nextPrompt` stop/tuner decisions (mode existence, prompt availability, tuner visibility/reset) into a tested plan builder.
- Added `src/calibration-utils.ts` and moved open-A tuning parsing plus calibrated A4 math out of `logic.ts`, with tests.
- Added `src/session-reset-state.ts` and moved stop-session state reset payload out of `stopListening`.
- Added `src/session-timeup-plan.ts` and moved timed-mode end-of-round score/high-score decision logic out of `handleTimeUp`.
- Added runtime safety guards in `src/logic.ts` around session loop, timed/calibration callbacks, and delayed prompt transitions to prevent uncaught exceptions from dropping the whole app.
- Added global `error`/`unhandledrejection` reporting in `index.tsx` bootstrap to surface client runtime failures in UI status and console.

### Quality and Tooling

- Added ESLint, Prettier, Vitest configuration and scripts.
- Expanded unit tests across:
  - music theory and instruments
  - DSP helpers
  - training-mode prompt generation (random/interval/scale/chords/progressions/arpeggios)
  - fretboard render/view helper modules
- Added PWA integration (`vite-plugin-pwa`) for offline support.
- Improved typings around Soundfont usage and removed key `any` gaps.

## 2026-03-12

### Architecture and Refactor

- Reduced `src/logic.ts` to a graph-oriented runtime composition root.
- Added graph-level runtime seams for:
  - performance feedback
  - prompt/performance runtime
  - detection runtime
  - lifecycle runtime
  - audio runtime
- Added dedicated dep-builder modules for each top-level runtime graph so graph inputs no longer live as giant inline object literals in `src/logic.ts`.
- Collapsed remaining repeated runtime helper closures in `src/logic.ts` into shared local helpers for mode lookup and practice-adjusted melody lookup.
- Continued flattening controller/runtime composition while keeping behavior unchanged and backing each seam with focused Vitest coverage.
