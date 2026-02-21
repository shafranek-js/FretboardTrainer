# Changelog

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
