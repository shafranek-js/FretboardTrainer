# Scrolling TAB Panel Plan

## Goal

Add a second melody-focused panel that shows a scrolling tablature player:

- strings stay fixed
- note blocks move right to left
- a fixed playhead marks the attack point
- the playhead moves on Y between string targets/events

This is a new panel. It should not replace the current `TAB Timeline`.

## Why This Fits The Current Codebase

We already have the main prerequisites:

- canonical melody data in `MelodyDefinition.events`
- playback duration logic in `src/melody-timeline-duration.ts`
- runtime mode state for:
  - melody demo
  - performance
  - preroll
  - active step
  - performance feedback
- zoom / BPM / study-range state
- a decomposed timeline/render layer, so we do not need to mutate the existing `TAB Timeline` heavily

The right implementation is to reuse existing melody/runtime state and add a new viewer/player module on top of it.

## Non-Goals

- do not replace the current `TAB Timeline`
- do not add a second independent playback engine
- do not fork a second melody data model if the current one can be normalized
- do not couple canvas animation to React-style rerender loops

## Recommended Architecture

Use a dedicated feature module:

```text
src/scrolling-tab-panel/
  types.ts
  model.ts
  geometry.ts
  engine.ts
  renderer.ts
  panel.ts
```

### Responsibilities

- `types.ts`
  - normalized note/event/player types
- `model.ts`
  - transform `MelodyDefinition.events` into scrolling render events
  - derive `startTime`, `duration`, `isChord`, string index, fret, pitch
- `geometry.ts`
  - string lane Y positions
  - fixed playhead X
  - visible bounds
  - note width / spacing math
- `engine.ts`
  - compute frame state from external runtime time
  - binary search current event by time
  - resolve playhead Y interpolation
- `renderer.ts`
  - draw fixed strings
  - draw measure lines
  - draw note blocks
  - draw chord connectors
  - draw playhead
- `panel.ts`
  - bind DOM/canvas
  - resize handling
  - render scheduling
  - integration entrypoint

## Data Model

Normalize existing melody events into a scrolling-player shape:

```ts
type ScrollingTabNote = {
  stringIndex: number
  stringName: string
  fret: number
  pitch: number | null
  startTimeSec: number
  durationSec: number
}

type ScrollingTabEvent = {
  index: number
  startTimeSec: number
  durationSec: number
  notes: ScrollingTabNote[]
  isChord: boolean
}
```

Important: this should be derived from the existing melody event list plus our current duration logic, not stored as a second persisted source of truth.

## Time Source

This is the most important constraint.

The scrolling panel must not own its own playback clock during integrated use.

It should render from existing runtime state:

- melody demo current time
- performance current prompt/runtime time
- preroll state

Practical rule:

- if demo/performance is active, the scrolling panel uses that active session time
- if nothing is playing, the panel can render a static preview at time `0`

## Rendering Model

Canvas is the right tool here.

Reason:

- continuous animation
- easier clipping and culling
- easier note-width rendering by duration
- easier playhead motion and future arc visuals

Recommended layout:

- one canvas for the panel
- optionally later split into:
  - static layer
  - dynamic layer

For MVP, a single canvas is acceptable if performance is good.

## Core Geometry

### Fixed Playhead

```ts
playheadX = viewportWidth * 0.2
```

### String Lanes

Evenly spaced vertical lanes:

```ts
stringY = topPadding + stringIndex * stringGap + stringGap / 2
```

### Note X

```ts
noteX = playheadX + note.startTimeSec * pixelsPerSecond - currentScrollX
currentScrollX = songTimeSec * pixelsPerSecond
```

### Note Width

```ts
noteWidth = Math.max(minBlockWidth, durationSec * pixelsPerSecond)
```

## Playhead Y

The playhead stays fixed on X and moves only on Y.

Use current and next event:

```ts
progress = clamp(
  (songTimeSec - current.startTimeSec) / (next.startTimeSec - current.startTimeSec),
  0,
  1
)
playheadY = lerp(currentY, nextY, progress)
```

For chords:

- use the vertical midpoint of the event note stack for MVP
- do not try to animate across multiple notes inside the same chord event yet

## Integration With Current Product

### Initial Scope

Only show the new panel in:

- `Melodies (Follow the Notes)`
- `Performance`

### Placement

Recommended:

- place it as a second panel near the current `TAB Timeline`
- do not hide or replace the classic timeline initially

This lets us validate usefulness without breaking the current workflow.

### Existing Controls To Reuse

- melody zoom
- BPM / tempo
- study range
- play / stop / step controls

Open product decision:

- either reuse the current `TAB Zoom`
- or introduce a separate `Scrolling Panel Zoom`

For MVP, reusing the current melody zoom is simpler.

## MVP Implementation Order

### Phase 1: Data + Static Preview

1. Add DOM shell for the new panel
2. Add `src/scrolling-tab-panel/*`
3. Normalize `MelodyDefinition.events` into `ScrollingTabEvent[]`
4. Render fixed strings and note blocks at `songTime = 0`
5. Render fixed playhead at static X

Done when:

- a selected melody shows readable note blocks in the new panel
- note width reflects duration
- chords render as grouped simultaneous events

### Phase 2: Runtime Sync

1. Expose a shared melody runtime time getter for UI rendering
2. Feed current playback time into the scrolling panel
3. Animate note motion right-to-left
4. Add playhead Y interpolation between events
5. Add event culling outside viewport bounds

Done when:

- demo playback and the new panel stay visibly synchronized
- performance mode advances the panel in sync with current prompt flow

### Phase 3: UX Polish

1. Add measure markers
2. Add optional transition arcs
3. Add resize handling
4. Validate long-song performance
5. Tune zoom and spacing

Done when:

- long melodies remain smooth
- panel is readable at default zoom
- resize does not desync geometry

### Phase 4: Optional Feedback Layer

Not required for MVP.

Possible later additions:

- correct/wrong/missed coloring on note blocks
- preroll visualization
- hit windows tied to performance timing
- compact minimap for scrolling panel

## Main Risks

### 1. Second Clock Drift

If the panel starts using an internal `requestAnimationFrame` time instead of the existing melody runtime, it will drift.

Mitigation:

- external runtime time must remain the source of truth

### 2. ASCII Timing Ambiguity

Some imported ASCII tabs do not contain precise beat timing.

Mitigation:

- always use our current normalized playback durations
- do not derive scrolling durations from raw ASCII spacing at render time

### 3. Too Much Scope In First Pass

Trying to add scoring, hit windows, flash effects, and transition arcs immediately will slow delivery.

Mitigation:

- keep MVP visual and sync-focused first

## Acceptance Criteria For MVP

- the panel renders a melody from existing `MelodyDefinition.events`
- note blocks move right-to-left during playback
- the playhead stays fixed on X
- the playhead moves on Y between string targets/events
- note width visibly reflects duration
- chord events are readable as simultaneous events
- panel stays synchronized with current melody demo/performance runtime
- resize and long-song rendering are stable enough for normal use
