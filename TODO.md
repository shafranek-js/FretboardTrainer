# TODO

## Sprint 1 (Done)

- [x] Add `ESLint` with a flat config and project scripts (`lint`, `lint:fix`).
- [x] Add `Prettier` config and scripts (`format`, `format:check`).
- [x] Add `Vitest` and baseline unit tests for pure logic:
  - [x] music note conversion
  - [x] interval naming utilities
  - [x] instrument note/octave mapping
- [x] Replace `any` around Soundfont usage with typed declarations.
- [x] Run `lint`, `test`, `build` and fix blocking issues.

## Sprint 2 (Done)

- [x] Improve monophonic pitch detection algorithm (YIN/MPM evaluation).
- [x] Improve polyphonic chord detection robustness.
- [x] Add loading overlay for soundfont initialization.
- [x] Add resilient offline mode with `vite-plugin-pwa`.

## Sprint 3 (Done)

- [x] Gradual UI architecture migration to reactive components.
  - [x] Decompose `index.tsx` listeners into focused controllers (`session`, `profiles`, `modals`, `resize`).
  - [x] Introduce first reactive UI signal (`statusBar`) and route status updates through it.
  - [x] Move `prompt/result` rendering to signal-driven updates and remove direct writes.
  - [x] Move `timer/score/timed panel` and `info slots` to signal-driven updates.
  - [x] Move session controls (`start/stop/hint/play`) and tuner visibility to signal-driven updates.
  - [x] Move calibration modal/status/progress updates to signal-driven state.
  - [x] Move mode-specific control visibility (`scale/chord/progression/arpeggio`, hint button) to signal-driven state.
  - [x] Extract mode-specific control visibility mapping into pure `training-mode-ui` helper with tests.
  - [x] Move loading overlay and control lock (`start/instrument/settings`) to signal-driven state.
  - [x] Move audio meter updates to signal-driven state and remove direct DOM writes from `logic.ts`.
  - [x] Move `settings/stats/guide/links/profileName` modal visibility to signal-driven state.
  - [x] Move profile action button state (`update/delete`) to signal-driven state.
  - [x] Move tuner needle/cents rendering to signal-driven state with pure `computeTunerView` logic and tests.
  - [x] Extract stats view-model calculations from `displayStats` into pure tested module.
  - [x] Move stats modal field/list rendering to signal-driven state.
  - [x] Consolidate enabled-string selection reads via shared `getEnabledStrings` helper across controllers/modes/logic/storage.
  - [x] Consolidate fret-range parsing in training modes via shared `getSelectedFretRange` helper.
  - [x] Centralize training-mode group classification (`chord/hint/audio/progression/arpeggio`) with shared helpers and tests.
  - [x] Extract prompt audio target/frequency resolution from `logic.ts` into pure `prompt-audio` helpers with tests.
  - [x] Extract frame-level audio processing logic (`rms`, calibration sample, mono/poly stability) from `logic.ts` into pure tested helpers.
  - [x] Add `audio-detection-handlers` orchestration layer (silence gate + mono/poly/calibration handler wrappers) and wire `processAudio` through it.
  - [x] Extract prompt audio orchestration from `logic.ts` into tested `prompt-audio-plan` builder.
  - [x] Extract result presentation helpers (`success info slots`, `timed points`) from `logic.ts` into tested `session-result` module.
  - [x] Extract reusable prompt/session tracking reset-state factories and wire them into audio/session flow.
  - [x] Extract `startListening` preflight planning (`timed/progression/arpeggio/button state`) into tested `session-start-preflight`.
  - [x] Extract WebAudio runtime lifecycle (`AudioContext`/`Analyser`/`MediaStream`) from `logic.ts` into tested `audio-runtime` module.
  - [x] Extract `displayResult` success-branch flow planning (`arpeggio/timed/standard`) into tested `session-success-plan`.
  - [x] Extract `nextPrompt` mode/prompt/tuner decision flow into tested `session-next-prompt-plan`.
  - [x] Extract calibration math/tuning parsing from `logic.ts` into tested `calibration-utils`.
  - [x] Extract full stop-session reset payload from `logic.ts` into tested `session-reset-state` factory.
  - [x] Extract timed-session finalization (`handleTimeUp` score/high-score decision) into tested `session-timeup-plan`.
  - [x] Add runtime safety guards in session loop/timeouts (`processAudio`, `displayResult`, `nextPrompt`, calibration/timed callbacks) to avoid full app crash on uncaught errors.
  - [x] Add global runtime error/rejection handlers in app bootstrap for clearer failure reporting.
- [x] Add broader unit tests for core training mode prompt generation (`random`, `interval`, `scale`).
- [x] Add broader unit tests for chord-based mode prompt generation (`chords`, `progressions`, `arpeggios`).
- [x] Evaluate replacing Canvas fretboard rendering with SVG.
  - [x] Extract renderer-agnostic `fretboard render plan` model with unit tests.
  - [x] Extract shared SVG rendering helpers (`enabled strings`, `fret range`, layout, string-label positioning).
  - [x] Migrate to SVG-only rendering and remove Canvas fallback/feature flag.
