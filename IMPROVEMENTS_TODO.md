# UI/UX Improvements TODO

## Purpose
Make the app approachable for new users without removing power-user capabilities. The main goal is to separate "practice experience" from "engine tuning" and guide users to a successful first session with minimal configuration.

## Problem Summary
- One screen exposes many workflows and technical controls at once.
- Beginner, melody-practice, and performance workflows are mixed together.
- Advanced detection settings are visible before a user even has input working.
- Related controls are scattered between the top bar, main panels, and settings modal.

## Non-Goals
- Do not remove advanced features.
- Do not change audio engine logic in this phase.
- Do not redesign the visual identity unless required for layout clarity.

## UX Principles
- Progressive disclosure: show advanced controls only when needed.
- Single-purpose entry points: one clear action to start a session.
- Presets over manual knobs for the 80% case.
- Mode-specific UI: show only controls relevant to the active workflow.
- Reuse existing UI controllers instead of building a parallel system.

## Delivery Order
1. Add workflow-aware visibility rules without removing the current `trainingMode` backend wiring.
2. Add `Simple` / `Advanced` UI mode and move technical controls behind it.
3. Add a first-run wizard and route users into the correct workflow.
4. Consolidate melody controls into one workspace.
5. Move diagnostics and maintenance tools out of the main practice path.
6. Add help, empty states, and summary recommendations.

## Epic List
- `P0` Primary entry experience and workflow separation
- `P1` Cognitive-load reduction and diagnostics separation
- `P2` Guidance, empty states, and re-entry

## P0: Primary Entry Experience

### [x] P0.0 Introduce Workflow Navigation
Priority: `P0`
Size: `L`
Goal: replace the current "one dropdown controls the whole app" mental model with explicit entry points.
Implementation:
- Add a workflow switcher above the existing setup panels.
- Keep `trainingMode` internally for compatibility.
- Map UI workflows to existing internal modes:
  - `Learn Notes` -> `random`, `adaptive`, `free`, `intervals`, `scales`, `chords`, `arpeggios`, `progressions`, `timed`
  - `Study Melody` -> `melody`
  - `Practice` -> `practice`
  - `Perform` -> `performance`, `rhythm`
  - `Library / Import` -> melody import/edit/export focused surface
- Hide or collapse the raw `trainingMode` selector in `Simple` mode.
Files:
- `index.html`
- `src/state.ts`
- `src/controllers/session-controller.ts`
- `src/controllers/practice-setup-summary-controller.ts`
Tests:
- Add controller tests for workflow -> panel visibility mapping.
- Add tests that existing `trainingMode` values still produce the expected behavior.
Acceptance:
- A new user can understand where to click without understanding internal mode names.
- Existing session logic still runs through the current `trainingMode` state.

### [x] P0.1 Add a First-Run Wizard
Priority: `P0`
Size: `M`
Goal: get from "open app" to "first successful note" in under 60 seconds.
Implementation:
- Add a first-run modal shown on first load.
- Store completion in local storage.
- Wizard steps:
  1. instrument selection
  2. input source selection
  3. quick input check
  4. choose goal: `Learn Notes`, `Study Melody`, `Practice`, or `Perform`
- Auto-route the user to the correct workflow and reveal the relevant panels.
- Add a "reopen onboarding" action in settings.
Files:
- `index.html`
- `src/state.ts`
- `src/controllers/modal-controller.ts`
- `src/controllers/session-controller.ts`
Tests:
- Add tests for first-load visibility.
- Add tests for saved onboarding state preventing auto-open on later launches.
Acceptance:
- A new user can start a basic session without opening settings.
- The wizard can be reopened manually.

### [x] P0.2 Add `Simple` vs `Advanced` UI Mode
Priority: `P0`
Size: `M`
Goal: hide technical controls from new users while keeping power features accessible.
Implementation:
- Add a global UI mode toggle.
- In `Simple` mode, hide:
  - mic attack filter
  - mic hold filter
  - polyphonic detector provider
  - exact latency input
  - benchmark and telemetry actions
  - raw mode details not needed for onboarding
- In `Advanced` mode, preserve the current surface area.
- Persist the UI mode in settings/profile storage.
Files:
- `index.html`
- `src/state.ts`
- `src/storage.ts`
- `src/controllers/session-controller.ts`
- `src/controllers/settings-modal-layout-controller.ts`
Tests:
- Add tests for storage persistence of `uiMode`.
- Add tests for visibility gating in `Simple` vs `Advanced`.
Acceptance:
- `Simple` mode reduces visible controls significantly.
- `Advanced` mode preserves all current capability.

### [x] P0.3 Consolidate Melody Workspace
Priority: `P0`
Size: `L`
Goal: put all melody workflow controls in one place.
Implementation:
- Consolidate tempo, metronome, loop, hint, TAB/scroller toggles, and playback actions into one melody workspace.
- Make the top transport workflow-aware:
  - in `melody` / `performance`: show melody transport controls
  - in note-learning modes: hide melody transport and show only session-relevant actions
- Avoid duplicate source-of-truth state if controls are mirrored temporarily during migration.
Files:
- `index.html`
- `src/state.ts`
- `src/controllers/melody-setup-ui-controller.ts`
- `src/controllers/session-controller.ts`
- `src/controllers/metronome-controller.ts`
Tests:
- Add tests for melody workspace visibility by mode.
- Add tests that mirrored controls stay synchronized if temporary duplication is used.
Acceptance:
- In melody/performance workflows, all melody controls are in one place.
- In non-melody workflows, melody transport does not clutter the main UI.

## P1: Cognitive-Load Reduction

### [x] P1.1 Replace Technical Labels With Task Language
Priority: `P1`
Size: `S`
Goal: make modes understandable without reading documentation.
Implementation:
- Rename labels in the UI:
  - `Random Note` -> `Find the Note`
  - `Adaptive Practice` -> `Practice Weak Spots`
  - `Melodies (Follow the Notes)` -> `Study Melody`
  - `Performance (Full Run)` -> `Play Through`
- Add short helper text for `Performance Mic Tolerance` and `Timing Leniency`.
- Update summary strings so they match the user-facing names.
Files:
- `index.html`
- `src/controllers/practice-setup-summary-controller.ts`
Tests:
- Add tests for summary output with renamed labels if needed.
Acceptance:
- A beginner can read the main mode labels without needing a glossary.

### [x] P1.2 Introduce Input and Timing Presets
Priority: `P1`
Size: `M`
Goal: reduce the need for manual mic tuning.
Implementation:
- Provide presets:
  - `Quiet Room`
  - `Normal Room`
  - `Noisy Room`
  - `Headphones / Direct Input`
- Each preset should map to user-facing behavior, not expose raw filter internals.
- Internally map presets to sensitivity, attack/hold defaults, and direct-input mode.
Files:
- `src/mic-input-sensitivity.ts`
- `src/mic-note-attack-filter.ts`
- `src/mic-note-hold-filter.ts`
- `src/controllers/mic-settings-controller.ts`
- `index.html`
Tests:
- Add tests that each preset applies the expected underlying values.
- Add tests that presets do not overwrite unrelated settings.
Acceptance:
- A user can get working mic detection without adjusting multiple individual controls.

### [x] P1.3 Add Mode-Specific Panel Filtering
Priority: `P1`
Size: `M`
Goal: show only relevant panels for the active workflow.
Implementation:
- `Learn Notes`: show practice setup + session tools, hide melody setup.
- `Study Melody` / `Practice` / `Perform`: show melody workspace and relevant transport, hide unrelated session plan controls.
- `Free Play`: hide melody library and session-goal UI.
- Keep visibility logic centralized instead of spreading it across unrelated handlers.
Files:
- `src/controllers/session-controller.ts`
- `src/controllers/melody-setup-ui-controller.ts`
- `src/controllers/practice-setup-summary-controller.ts`
Tests:
- Add tests for each workflow surface.
Acceptance:
- Every workflow hides at least one major irrelevant panel.

### [x] P1.4 Separate Diagnostics From Practice UI
Priority: `P1`
Size: `M`
Goal: keep benchmarking, telemetry, and low-level detection tools out of the main practice path.
Implementation:
- Move the following into `Advanced > Diagnostics`:
  - polyphonic detector benchmark
  - telemetry export
  - raw detector provider selection
  - attack/hold filter selectors
- Keep only user-facing controls in the main surface:
  - input source
  - device
  - headphones/direct input
  - latency
  - one-click calibration
Files:
- `index.html`
- `src/controllers/settings-modal-layout-controller.ts`
- `src/controllers/mic-settings-controller.ts`
- `src/controllers/modal-controller.ts`
Tests:
- Add visibility tests for diagnostics controls in `Simple` and `Advanced`.
Acceptance:
- A new user never sees benchmark/telemetry controls in `Simple` mode.
- Advanced diagnostics remain available without feature loss.

### [x] P1.5 Add Better Empty States
Priority: `P1`
Size: `M`
Goal: replace dead ends with guided next actions.
Implementation:
- If no melody is selected, show a starter library suggestion and one clear CTA.
- If mic permission is missing, show a concise checklist instead of raw status text.
- If no MIDI device is available, explain that clearly and suggest the mic workflow.
- If import fails, explain the next valid step instead of only showing an error.
Files:
- `index.html`
- `src/controllers/session-controller.ts`
- `src/controllers/input-device-controller.ts`
- `src/midi-runtime.ts`
- `src/controllers/melody-import-modal-controller.ts`
Tests:
- Add tests for missing-device/missing-selection states where controller logic exists.
Acceptance:
- The user always sees one next action when a required dependency is missing.

## P2: Guidance and Re-Entry

### [x] P2.1 Add Contextual Help Cards
Priority: `P2`
Size: `S`
Goal: explain controls inline without opening the full guide.
Implementation:
- Add small inline help affordances near:
  - input source
  - start session
  - melody library
  - performance mode
- Link those entries to specific guide/help content where possible.
Files:
- `index.html`
- `src/controllers/modal-controller.ts`
Tests:
- Minimal controller tests if new modal-routing logic is added.
Acceptance:
- New users can access help from the current context without opening the full settings flow.

### [x] P2.2 Add Next-Step Recommendations to Session Summary
Priority: `P2`
Size: `M`
Goal: use the summary modal to drive the next user action.
Implementation:
- Generate one recommendation based on the latest session outcome:
  - `Repeat weak spots`
  - `Slow to 70 BPM`
  - `Enable headphones mode`
  - `Switch to guided melody first`
- Keep this to a single primary recommendation to avoid summary clutter.
Files:
- `src/controllers/session-controller.ts`
- `src/stats-view.ts`
- `index.html`
Tests:
- Add tests for recommendation selection rules if logic becomes non-trivial.
Acceptance:
- Session summary shows one clear next action instead of only historical stats.

### [x] P2.3 Surface Recommended Defaults
Priority: `P2`
Size: `S`
Goal: make the product feel guided rather than configurable.
Implementation:
- Add `Recommended` badges next to:
  - default workflow
  - default input preset
  - default timing preset
  - headphones/direct input in performance mode
- Use plain-language helper text rather than engine language.
Files:
- `index.html`
- `src/controllers/session-controller.ts`
- `src/controllers/mic-settings-controller.ts`
Tests:
- UI/controller tests only if recommendation visibility is dynamic.
Acceptance:
- A new user can keep the defaults with confidence.

## P3: Melody Learning Ladder

### [x] P3.1 Split Melody Workflows Into Study / Practice / Perform
Priority: `P0`
Size: `L`
Goal: separate "learn the notes", "drill the song", and "final run" into distinct user-facing workflows.
Implementation:
- Rename `Practice Melody` workflow to `Study Melody`.
- Add a new `Practice` workflow between `Study Melody` and `Perform`.
- Keep the current `melody` mode for note-by-note study.
- Add a new internal `practice` training mode based on the continuous melody-performance path.
- Keep `Perform` as the final evaluated run.
- Update workflow switcher, onboarding, quick help, guide copy, summaries, and mode labels so the new progression is explicit:
  - `Study Melody` = note-by-note study
  - `Practice` = repeatable full-song drill
  - `Perform` = final scored run
Files:
- `index.html`
- `src/training-workflows.ts`
- `src/training-mode-labels.ts`
- `src/training-mode-ui.ts`
- `src/controllers/session-controller.ts`
- `src/controllers/modal-controller.ts`
- `src/context-help-content.ts`
- `src/controllers/practice-setup-summary-controller.ts`
Tests:
- Add tests for workflow mapping and default training-mode routing.
- Add tests for workflow-specific CTA labels and panel labels.
- Add tests for guide/help copy changes where coverage already exists.
Acceptance:
- A user can clearly tell the difference between studying a melody, drilling it repeatedly, and doing a final performance run.
- The UI no longer suggests that step-by-step study and full-run practice are the same thing.

### [x] P3.2 Make `Practice` a Continuous Drill Mode
Priority: `P0`
Size: `L`
Goal: provide a low-pressure repetition mode for building consistency before `Perform`.
Implementation:
- Reuse the performance transport path for the new `practice` mode.
- Keep preroll/count-in.
- Auto-loop back to the start of the active melody range when the range completes.
- Do not stop the session automatically at the end of each pass.
- Keep loop-range support and metronome sync identical to full-run playback.
Files:
- `src/logic.ts`
- `src/modes/index.ts`
- `src/modes/melody-performance.ts`
- `src/session-initial-prompt-plan.ts`
- `src/training-mode-groups.ts`
Tests:
- Add logic tests for practice-mode transport looping.
- Add tests that `practice` uses melody-performance transport visibility and preroll.
Acceptance:
- `Practice` can run the active melody range repeatedly without dropping back to the idle state after each pass.
- `Practice` feels like drill mode, not like a stopped session after every full run.

### [x] P3.3 Keep Final Grading Exclusive to `Perform`
Priority: `P1`
Size: `M`
Goal: reduce performance pressure in `Practice` and reserve formal evaluation for `Perform`.
Implementation:
- Suppress final-score framing in `Practice`.
- Keep `Perform` as the only workflow that presents formal final-run scoring.
- Add a star-based end summary for `Perform` only:
  - `1 star`: completed the run
  - `2 stars`: solid accuracy and timing
  - `3 stars`: strong near-clean run
- Store best star result per melody/range for future replay and motivation.
Files:
- `src/stats-view.ts`
- `src/ui.ts`
- `src/ui-signals.ts`
- `src/storage-stats.ts`
- `src/types.ts`
Tests:
- Add stats-view tests for `practice` vs `perform`.
- Add tests for star-threshold rendering once implemented.
Acceptance:
- `Practice` encourages repetition without framing the result as a final graded attempt.
- `Perform` has a clearly more formal end state than `Practice`.

### [x] P3.4 Add a Dedicated `Editor` Workflow for Melody Creation and Note Editing
Priority: `P1`
Size: `M`
Goal: separate melody authoring from melody browsing and practice so note-editing tools only appear in an editing-focused surface.
Implementation:
- Add a new UI-only `Editor` workflow next to `Library`.
- Keep `Editor` on top of the existing `melody` data/model path instead of creating a separate runtime training mode.
- Move melody-authoring controls into `Editor`:
  - create/import melody
  - edit selected melody
  - bake adjusted melody as a new custom melody
  - note-editing tools inside the melody import/editor modal
- Keep `Library` focused on:
  - selecting melodies
  - preview playback
  - export/delete/cleanup actions
- Restrict timeline note editing and melody-edit hotkeys to the `Editor` workflow only.
- Update workflow copy, empty states, quick help, and guide text so the split between `Library` and `Editor` is explicit.
Files:
- `index.html`
- `src/training-workflows.ts`
- `src/workflow-ui-copy.ts`
- `src/melody-empty-state.ts`
- `src/context-help-content.ts`
- `src/ui-signals.ts`
- `src/controllers/session-controller.ts`
- `src/controllers/melody-timeline-editing-controller.ts`
- `src/controllers/melody-timeline-editing-orchestrator.ts`
Tests:
- Add tests for workflow routing and panel visibility with the new `Editor` workflow.
- Add tests for workflow-specific CTA labels and preview/playback copy.
- Add tests for editor-specific empty-state wording.
Acceptance:
- A user can browse the melody library without seeing note-editing controls.
- A user can enter `Editor` and immediately create/import or edit source notes.
- Timeline note editing is unavailable outside the `Editor` workflow.

## Existing Building Blocks To Reuse
- `src/controllers/settings-modal-layout-controller.ts`: already separates settings into sections.
- `src/controllers/practice-setup-summary-controller.ts`: already summarizes current setup.
- `src/controllers/melody-setup-ui-controller.ts`: already contains melody-specific visibility logic.
- `src/controllers/modal-controller.ts`: already owns modal flows and is the right place for onboarding/help routing.

## Risks and Constraints
- Do not break saved settings or profile loading while introducing `uiMode` and `uiWorkflow`.
- Avoid duplicate source-of-truth state between top transport and melody workspace controls.
- Avoid a half-migrated UI where both old and new entry systems are visible without ownership.
- Maintain keyboard accessibility for new workflow switchers and onboarding modal steps.

## Definition of Done Per Epic
- [ ] The UI change is mode-aware and does not leave orphan controls visible.
- [ ] Existing settings and profiles still load safely.
- [ ] Labels and helper text use task language, not engine language.
- [ ] New state is persisted where appropriate.
- [ ] Visibility/state mapping changes are covered by targeted tests.

## Final Acceptance Checklist
- [ ] A first-time user can start a note-training session without opening settings.
- [ ] A first-time user can import or select a melody and start playback within two clicks.
- [ ] No advanced controls are visible in `Simple` mode unless explicitly requested.
- [ ] `Advanced` mode preserves all current controls and capabilities.
- [ ] No audio-engine behavior changes are required for this phase.

## Follow-Up
- [ ] Evaluate whether the internal `trainingMode` matrix can be simplified after workflow UI proves stable.
- [ ] Add telemetry on how often users open advanced settings during their first session.
- [ ] Consider A/B testing `Simple` as the default for new users.
