# TODO

## Current Priorities

- [ ] `P0` Performance mic (140+ BPM): move monophonic detection from `requestAnimationFrame` to `AudioWorklet` fixed-hop processing.
- [ ] `P0` Performance mic (140+ BPM): split monophonic path into `onset detector -> pitch tracker` to reduce missed short notes and jitter sensitivity.
- [ ] `P0` Performance mic (140+ BPM): run a validation matrix (`60/90/120/140/160 BPM`) with `Direct Input ON/OFF`, compare exported telemetry, and retune thresholds.
- [ ] `P0` Performance transport: finish continuous song-clock model (`FretFlow` style) so detection affects scoring only and never blocks timeline progression.
- [ ] `P1` Polyphonic mic detector: collect representative desktop/laptop/mobile telemetry snapshots and retune latency/threshold defaults.
- [ ] `P1` Scrolling TAB panel: finish extended manual QA (`resize`, long-song runtime performance, zoom/tempo synchronization).

## Architecture Backlog

- [ ] `P2` Continue decomposing `src/logic.ts` into focused executors/orchestrators.
- [ ] `P2` Split global app state into domain slices (`audio`, `session`, `melody`, `ui`).
- [ ] `P2` Incrementally reshape flat `src/` layout into domain folders once boundaries are stable.

## Recently Completed (March 2026)

- [x] Adaptive prompt-audio ignore window by event duration.
- [x] `Headphones / Direct Input` mode (`ignorePromptAudioUntilMs = 0`).
- [x] Persisted `isDirectInputMode` in profile settings.
- [x] Added `context.isDirectInputMode` to session analysis export for ON/OFF A/B comparisons.
- [x] Added faster `performance_fast` monophonic EMA profile for performance-adaptive mic input.
- [x] Added a strong-attack fast acceptance path in performance mic judging thresholds to reduce early-frame `low_confidence/low_voicing` rejects.
- [x] Added event-level onset reject logging + capture telemetry for `no-stable` diagnostics.
- [x] Improved runtime short-hold calibration ramp for earlier in-session adaptation.
- [x] Added mic latency UX: exact ms input, suggestion/apply action, calibration loop.
- [x] Added low-latency analyser profile (`fftSize 2048`) + focused YIN search window with safe fallback.
- [x] Aligned `Wrong` vs `Missed (No Input)` classification across session stats and performance note log.
- [x] Removed Windows timer-step jitter from timeline follow by switching to `performance.now()` soft-follow smoothing in `resolveSmoothedScrollingRuntimeTime`.
- [x] Optimized TAB Timeline repaint path with DOM cell caches (`classicCellCache`, `timelineCellByEventCache`) and O(1) event-cell lookups.
- [x] Removed `scrollWidth/clientWidth` from runtime points cache key and added explicit cache invalidation on `resize`.
- [x] Removed per-frame fretboard layout reads from render path by caching fretboard size via `ResizeObserver` in `drawFretboardSvg`.
- [x] Removed `activeEventIndex`/feedback dependency from scrolling-panel moving-layer cache key so giant scene canvas is not rebuilt on every session hit.
- [x] Moved scrolling-panel performance feedback rendering to lightweight viewport overlay pass instead of scene-canvas rebuilds.
- [x] Added same-frame guard in `resolveSmoothedScrollingRuntimeTime` to avoid double-applying smoothing during note-hit UI updates.
- [x] Removed minimap runtime full re-layout on `activeEventIndex` changes by caching event midpoint ratios and updating only playhead/progress styles.
- [x] Made melody prompt text static (`Playback/Melody/Performance: <melody name>`) to avoid per-note prompt reflow from note/fret text churn.
- [x] Reworked top session header into a stable grid layout and fixed status block width/ellipsis so prompt/status text changes do not squeeze neighboring controls.
- [x] Widened top tempo slider for finer BPM tuning and replaced `Click Off/On` text button with a metronome icon toggle.
- [x] Added timeline context-menu finger/color reassignment (`Auto`, `0..4`) with persisted note-level finger override and undo/redo support.
- [x] Restored `Scarborough Fair` built-in meter metadata to `3/4` for bar-accent alignment with the melody phrasing.
- [x] Aligned melody demo metronome start/resume to a shared `performance.now()` playback anchor to remove initial phase offset.
- [x] Stopped metronome phase resets on runtime sync when BPM is unchanged and added lag catch-up beat-index compensation.
- [x] Unified Scroller arc rendering and playhead trajectory math (single quadratic model + onset-aligned arc anchors) to remove wrong note-to-note flight paths.
