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

## Sprint 4 (In Progress)

- [x] Replace blocking `alert()` calls in core session start/prompt flow with non-blocking in-app error messaging.
- [x] Replace blocking metronome start `alert()` calls in session controls with non-blocking in-app error messaging.
- [x] Replace blocking `alert()` calls in profile controller and soundfont loading with non-blocking in-app messaging.
- [x] Replace direct runtime `alert()` calls in `modes/*` with a feedback port wired to in-app messaging.
- [x] Replace direct `confirm()` calls in controllers with a confirm port (native fallback for now).
- [x] Implement in-app confirmation UX and wire the confirm port to non-blocking modal dialogs.
- [x] Fix melody practice completion UX so "Melody complete" feedback remains visible after session auto-stop.
- [x] Persist selected melody in profile settings and restore it after reload/profile switch.
- [x] Add in-session melody TAB timeline panel with active-step highlight and finger-color note chips synchronized with demo/session step progression.
- [x] Add DAW-style melody study-range editing with draggable timeline handles and movable selected range bar.
- [x] Add `Loop Range` toggle for melody demo playback over the selected study fragment.
- [x] Tighten training-mode contract so `generatePrompt()` stays side-effect free (no direct UI writes on completion/error paths).
- [x] Reduce `src/logic.ts` orchestration size by extracting session lifecycle/error-reporting helpers.
  - [x] Extract rhythm timing evaluation/formatting helpers into `src/rhythm-timing.ts` with unit tests.
  - [x] Extract session goal mapping/formatting helpers into `src/session-goal.ts` with unit tests.
  - [x] Extract timeout/cooldown registry helpers into `src/session-timeouts.ts` with unit tests.
  - [x] Extract free-play live note highlight helpers into `src/live-detected-highlight.ts` with unit tests.
  - [x] Extract session runtime error handler (with reentrancy guard) into `src/session-runtime-error-handler.ts` with unit tests.
  - [x] Extract monophonic/MIDI reaction planners into `src/session-detection-reactions.ts` with unit tests.
  - [x] Extract `displayResult()` success-plan branch executor into `src/session-success-executor.ts` with unit tests.
  - [x] Extract `displayResult()` success/goal orchestration into `src/display-result-success-flow-executor.ts` with unit tests.
  - [x] Extract `nextPrompt()` plan execution branch into `src/session-next-prompt-executor.ts` with unit tests.
  - [x] Extract calibration finish/cancel flow helpers into `src/calibration-session-flow.ts` with unit tests.
  - [x] Extract `configurePromptAudio()` side-effect executor into `src/prompt-audio-executor.ts` with unit tests.
  - [x] Extend `session-detection-reactions` with audio polyphonic/monophonic/calibration frame planners and wire them into `processAudio()`.
  - [x] Extract `processAudio()` post-volume silence/mode preflight planning into `src/process-audio-frame-preflight.ts` with unit tests.
  - [x] Extract post-input session activation/startup side effects from `startListening()` into `src/session-runtime-activation-executor.ts` with unit tests.
  - [x] Extract MIDI session message routing callback factory from `startListening()` into `src/midi-session-message-handler.ts` with unit tests.
  - [x] Extract timed session interval tick callback from `startListening()` into `src/timed-session-interval-handler.ts` with unit tests.
  - [x] Extract performance prompt lifecycle (`resolve success`, scheduled miss/advance, run-token invalidation) into `src/performance-prompt-controller.ts` with unit tests.
  - [x] Extract wrong-note highlight / octave-mismatch helpers into `src/detected-note-feedback.ts` with unit tests.
  - [x] Extract polyphonic melody mismatch feedback/cooldown handling into `src/melody-polyphonic-feedback-controller.ts` with unit tests.
  - [x] Extract stable monophonic note handling (free/rhythm/performance/polyphonic-melody branches) into `src/stable-monophonic-detection-controller.ts` with unit tests.
  - [x] Extract polyphonic melody runtime detection (`mic` + `MIDI` branches) into `src/melody-runtime-detection-controller.ts` with unit tests.
  - [x] Extract polyphonic chord runtime detection (`audio` + `MIDI` chord branches) into `src/polyphonic-chord-detection-controller.ts` with unit tests.
- [x] Continue reducing `src/controllers/session-controller.ts` into orchestration-only wiring.
  - [x] Extract melody timeline editing model/controller/orchestrator stack with direct unit tests.
  - [x] Extract melody demo runtime controller with direct unit tests.
  - [x] Extract melody import preview controller with direct unit tests.
  - [x] Extract melody event editor controller with direct unit tests.
  - [x] Extract melody import modal controller with direct unit tests.
  - [x] Extract melody library actions controller with direct unit tests.
  - [x] Extract melody practice settings controller with direct unit tests.
  - [x] Extract melody setup UI controller with direct unit tests.
  - [x] Extract practice setup summary controller with direct unit tests.
  - [x] Extract curriculum preset controller with direct unit tests.
  - [x] Extract metronome / rhythm preflight controller with direct unit tests.
  - [x] Extract mic settings / noise gate / calibration controller with direct unit tests.
  - [x] Extract audio input / MIDI input / input-source switching controller with direct unit tests.
  - [x] Extract melody practice action side effects (`transpose`, `string shift`, `study range`, batch transpose) with direct unit tests.
  - [x] Extract melody demo helper/presentation cluster (`prompt` building, BPM sync/clamp, preview rendering, audio-ready preflight).
  - [x] Re-evaluate remaining `session-controller` code and stop extracting once only true cross-feature orchestration remains.
- [x] Harden DOM binding initialization (`src/state.ts`) with explicit missing-element assertions instead of unchecked casts.
  - [x] Add DOM require-helpers and convert critical session/tuner/feedback/confirm elements to explicit startup assertions.
  - [x] Expand `requireElementById` / `requireQuerySelector` usage across the full `dom` registry.
- [x] Fix post-import / parser regressions from code review.
  - [x] Prevent ASCII count lines (starting with digits) from being parsed as tab string rows.
  - [x] Preserve `e` vs `E` disambiguation for lettered guitar tabs.
  - [x] Re-apply saved melody selection on profile switch.
  - [x] Skip/warn unresolved MIDI notes instead of saving `null` fret/string positions into imported melody events.
- [x] Consolidate tablature position optimization into a shared DP/Viterbi module (`src/tablature-optimizer.ts`) and route MIDI import through it.
  - [x] Keep duplicated pitch classes as distinct playable notes (no collapsing) when events are polyphonic.
  - [x] Improve ergonomic cost model (stretch/high-fret penalties, softer open-string bonus for polyphony).
  - [x] Reuse the same optimizer for event-melody import/storage fallback when explicit string/fret constraints are missing.

## Future / Backlog

- [ ] Port selected melody workflow upgrades from legacy `fretflow`.
  - [x] Add per-melody `String Shift` with feasibility guardrails and synchronized TAB/fretboard/demo rendering.
  - [x] Add `Performance Mode` for uninterrupted full-song runs with dedicated scoring.
  - [x] Add compact melody `Minimap` / overview navigation with seek + viewport drag.
  - [x] Add structured note-level melody editor with undo/redo.
  - [x] Add MIDI export for edited custom melodies.
  - [x] Add separate MIDI export for the current practice-adjusted melody (`transpose` / `string shift` / demo BPM applied).
- [x] Add microphone polyphonic detection support for true simultaneous-note/chord verification in melody practice (separate from MIDI note events) using the existing spectrum-based detector path.
  - [x] Extract a pluggable mic polyphonic detector provider interface (`spectrum` baseline first, external engine adapters next).
  - [x] Add an experimental `Essentia.js` (`MultiPitchKlapuri` / `MultiPitchMelodia`) provider spike behind a feature flag (license/CPU review required).
  - [ ] Evaluate `Basic Pitch` (`basic-pitch-ts`) as an offline/analysis import path (likely not low-latency enough for live session verification).
  - [ ] Evaluate `ONNX Runtime Web` (`wasm` / `webgpu`) runtime path for custom multi-pitch models if `Essentia.js` quality is insufficient.
  - [ ] Improve algorithm quality/tradeoffs (e.g., harmonic product spectrum, spectral peak clustering, multi-pitch estimation) for browser/WebAudio constraints.
  - [ ] Define UX fallback when confidence is low (avoid false chord matches from noise/room echo).
  - [ ] Benchmark latency/CPU on typical devices and tune thresholds for stability.
    - [x] Add runtime telemetry UI for mic poly detector (frames / avg/last/max latency / fallback count / warning count).
