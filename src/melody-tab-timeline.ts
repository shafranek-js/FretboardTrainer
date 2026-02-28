import { dom } from './state';
import type { MelodyDefinition } from './melody-library';
import type { IInstrument } from './instruments/instrument';
import { buildMelodyTabTimelineViewModel, type TimelineNoteChip } from './melody-tab-timeline-model';
import {
  computeDraggedMelodyStudyRange,
  resolveTimelineStepIndexFromX,
  type MelodyStudyRangeDragMode,
  type TimelineStepMetric,
} from './melody-study-range-drag';
import {
  formatMelodyStudyRange,
  getMelodyStudyRangeLength,
  normalizeMelodyStudyRange,
  type MelodyStudyRange,
} from './melody-study-range';
import {
  computeTimelineDurationLayout,
  getEventDurationBeats,
  type TimelineDurationLayout,
} from './melody-timeline-duration';
import {
  buildMelodyMinimapLayout,
  resolveMelodyMinimapEventIndexFromRatio,
} from './melody-minimap';

const DEFAULT_TIMELINE_BEATS_PER_BAR = 4;

const FINGER_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#a855f7',
  3: '#0ea5e9',
  4: '#ef4444',
};

let lastRenderKey = '';
let timelineScrollChromeBound = false;
let timelinePanBound = false;
let onMelodyStudyRangeCommit:
  | ((payload: { melodyId: string; range: MelodyStudyRange }) => void)
  | null = null;
let onMelodyTimelineSeek:
  | ((payload: { melodyId: string; eventIndex: number; commit: boolean }) => void)
  | null = null;
let onMelodyTimelineNoteSelect:
  | ((payload: { melodyId: string; eventIndex: number; noteIndex: number }) => void)
  | null = null;
let onMelodyTimelineNoteDrag:
  | ((payload: { melodyId: string; eventIndex: number; noteIndex: number; stringName: string; commit: boolean }) => void)
  | null = null;
let onMelodyTimelineEventDrag:
  | ((payload: { melodyId: string; sourceEventIndex: number; targetEventIndex: number; commit: boolean }) => void)
  | null = null;
let activeTimelineNoteDragSource: { eventIndex: number; noteIndex: number } | null = null;

function buildMelodyContentSignature(melody: Pick<MelodyDefinition, 'events'>) {
  let hash = 2166136261;
  for (const event of melody.events) {
    hash ^= (event.barIndex ?? -1) + 17;
    hash = Math.imul(hash, 16777619);
    hash ^= (event.column ?? -1) + 31;
    hash = Math.imul(hash, 16777619);
    hash ^= (event.durationColumns ?? -1) + 47;
    hash = Math.imul(hash, 16777619);
    hash ^= (event.durationCountSteps ?? -1) + 61;
    hash = Math.imul(hash, 16777619);
    hash ^= Math.round((event.durationBeats ?? -1) * 1000) + 79;
    hash = Math.imul(hash, 16777619);

    for (const note of event.notes) {
      const noteText = `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}`;
      for (let index = 0; index < noteText.length; index++) {
        hash ^= noteText.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
  }

  return (hash >>> 0).toString(16);
}

interface TimelineBarGrouping {
  source: 'none' | 'explicit' | 'duration';
  hasBeatTiming: boolean;
  beatsPerBar: number | null;
  totalBars: number | null;
  barStartEventIndexes: Set<number>;
}

function getFingerColor(finger: number) {
  const normalized = Number.isFinite(finger) ? Math.max(0, Math.min(4, Math.round(finger))) : 0;
  return FINGER_COLORS[normalized] ?? FINGER_COLORS[0];
}

function withAlpha(hexColor: string, alpha: number) {
  const sanitized = hexColor.replace('#', '');
  if (sanitized.length !== 6) return hexColor;
  const red = Number.parseInt(sanitized.slice(0, 2), 16);
  const green = Number.parseInt(sanitized.slice(2, 4), 16);
  const blue = Number.parseInt(sanitized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createCellNoteChip(note: TimelineNoteChip) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className =
    'inline-flex items-center justify-center min-w-[18px] px-1 py-0 rounded-sm text-[10px] leading-4 font-semibold text-slate-50';
  chip.style.backgroundColor = getFingerColor(note.finger);
  chip.title = `${note.note} | fret ${note.fret} | finger ${note.finger}`;
  chip.textContent = String(note.fret);
  chip.dataset.timelineNoPan = 'true';
  chip.dataset.noteIndex = String(note.noteIndex);
  chip.dataset.eventIndex = '';
  return chip;
}

function getPrimaryCellFingerColor(notes: TimelineNoteChip[]) {
  if (notes.length === 0) return '#67e8f9';
  return getFingerColor(notes[0]?.finger ?? 0);
}

function clearGrid() {
  dom.melodyTabTimelineGrid.innerHTML = '';
}

function centerTimelineEvent(eventIndex: number, behavior: ScrollBehavior = 'smooth') {
  if (!Number.isFinite(eventIndex) || eventIndex < 0) return;
  const scroller = dom.melodyTabTimelineGrid;
  const anchor = scroller.querySelector<HTMLElement>(
    `[data-timeline-step-anchor="true"][data-event-index="${eventIndex}"]`
  );
  if (!anchor) return;

  const anchorLeft = anchor.offsetLeft;
  const targetLeft = anchorLeft - (scroller.clientWidth - anchor.clientWidth) / 2;
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  scroller.scrollTo({
    left: Math.max(0, Math.min(maxScrollLeft, targetLeft)),
    behavior,
  });
}

function updateTimelineScrollChrome() {
  const viewport = dom.melodyTabTimelineViewport;
  const scroller = dom.melodyTabTimelineGrid;
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const isScrollable = maxScrollLeft > 4;
  const hasLeftOverflow = isScrollable && scroller.scrollLeft > 2;
  const hasRightOverflow = isScrollable && scroller.scrollLeft < maxScrollLeft - 2;

  viewport.dataset.scrollable = isScrollable ? 'true' : 'false';
  viewport.dataset.scrollLeft = hasLeftOverflow ? 'true' : 'false';
  viewport.dataset.scrollRight = hasRightOverflow ? 'true' : 'false';
}

function bindTimelineScrollChrome() {
  if (timelineScrollChromeBound) return;
  timelineScrollChromeBound = true;

  dom.melodyTabTimelineGrid.addEventListener(
    'scroll',
    () => {
      updateTimelineScrollChrome();
    },
    { passive: true }
  );

  window.addEventListener(
    'resize',
    () => {
      updateTimelineScrollChrome();
    },
    { passive: true }
  );
}

function bindTimelineDragPan() {
  if (timelinePanBound) return;
  timelinePanBound = true;

  const scroller = dom.melodyTabTimelineGrid;
  let pointerId: number | null = null;
  let startClientX = 0;
  let startScrollLeft = 0;
  let isDragging = false;
  let lastClientX = 0;
  let lastTimestamp = 0;
  let velocityPxPerMs = 0;
  let inertiaFrameId: number | null = null;

  const cancelInertia = () => {
    if (inertiaFrameId !== null) {
      window.cancelAnimationFrame(inertiaFrameId);
      inertiaFrameId = null;
    }
  };

  const startInertia = () => {
    if (Math.abs(velocityPxPerMs) < 0.01) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cancelInertia();
    let currentVelocity = velocityPxPerMs;
    let frameTimestamp = performance.now();

    const tick = (timestamp: number) => {
      const dt = Math.min(34, Math.max(8, timestamp - frameTimestamp));
      frameTimestamp = timestamp;
      if (Math.abs(currentVelocity) < 0.01) {
        cancelInertia();
        return;
      }

      const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const previousScrollLeft = scroller.scrollLeft;
      const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, previousScrollLeft + currentVelocity * dt));
      scroller.scrollLeft = nextScrollLeft;

      if (Math.abs(nextScrollLeft - previousScrollLeft) < 0.1) {
        cancelInertia();
        return;
      }

      currentVelocity *= Math.pow(0.92, dt / 16);
      inertiaFrameId = window.requestAnimationFrame(tick);
    };

    inertiaFrameId = window.requestAnimationFrame(tick);
  };

  const finishDrag = () => {
    pointerId = null;
    isDragging = false;
    scroller.classList.remove('is-drag-panning');
  };

  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-timeline-no-pan="true"]')) return;
    if (target?.closest('button, input, select, textarea, a')) return;
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;

    cancelInertia();
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startScrollLeft = scroller.scrollLeft;
    lastClientX = event.clientX;
    lastTimestamp = event.timeStamp;
    velocityPxPerMs = 0;
    isDragging = false;
    scroller.setPointerCapture(event.pointerId);
  });

  scroller.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - startClientX;
    if (!isDragging && Math.abs(deltaX) < 3) return;
    isDragging = true;
    scroller.classList.add('is-drag-panning');
    scroller.scrollLeft = startScrollLeft - deltaX;
    const dt = Math.max(1, event.timeStamp - lastTimestamp);
    const clientDelta = event.clientX - lastClientX;
    velocityPxPerMs = -clientDelta / dt;
    lastClientX = event.clientX;
    lastTimestamp = event.timeStamp;
    event.preventDefault();
  });

  scroller.addEventListener('pointerup', (event) => {
    if (pointerId !== event.pointerId) return;
    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
    const shouldInertia = isDragging;
    finishDrag();
    if (shouldInertia) {
      startInertia();
    }
  });

  scroller.addEventListener('pointercancel', (event) => {
    if (pointerId !== event.pointerId) return;
    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
    finishDrag();
    cancelInertia();
  });

  scroller.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-timeline-no-pan="true"]')) return;
    const activeEventIndex = Number.parseInt(scroller.dataset.activeEventIndex ?? '-1', 10);
    if (!Number.isFinite(activeEventIndex) || activeEventIndex < 0) return;
    centerTimelineEvent(activeEventIndex);
  });
}

export function setMelodyTimelineStudyRangeCommitHandler(
  handler: ((payload: { melodyId: string; range: MelodyStudyRange }) => void) | null
) {
  onMelodyStudyRangeCommit = handler;
}

export function setMelodyTimelineSeekHandler(
  handler: ((payload: { melodyId: string; eventIndex: number; commit: boolean }) => void) | null
) {
  onMelodyTimelineSeek = handler;
}

export function setMelodyTimelineNoteSelectHandler(
  handler: ((payload: { melodyId: string; eventIndex: number; noteIndex: number }) => void) | null
) {
  onMelodyTimelineNoteSelect = handler;
}

export function setMelodyTimelineNoteDragHandler(
  handler:
    | ((payload: { melodyId: string; eventIndex: number; noteIndex: number; stringName: string; commit: boolean }) => void)
    | null
) {
  onMelodyTimelineNoteDrag = handler;
}

export function setMelodyTimelineEventDragHandler(
  handler:
    | ((payload: { melodyId: string; sourceEventIndex: number; targetEventIndex: number; commit: boolean }) => void)
    | null
) {
  onMelodyTimelineEventDrag = handler;
}

function normalizeNonNegativeInteger(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function buildTimelineBarGrouping(melody: Pick<MelodyDefinition, 'events'>): TimelineBarGrouping {
  const explicitBarIndexes = melody.events.map((event) => normalizeNonNegativeInteger(event.barIndex));
  const hasExplicitBarIndexes = explicitBarIndexes.length > 0 && explicitBarIndexes.every((bar) => bar !== null);
  if (hasExplicitBarIndexes) {
    const bars = explicitBarIndexes as number[];
    const barStartEventIndexes = new Set<number>();
    for (let eventIndex = 1; eventIndex < bars.length; eventIndex++) {
      if (bars[eventIndex] !== bars[eventIndex - 1]) {
        barStartEventIndexes.add(eventIndex);
      }
    }

    const minBar = Math.min(...bars);
    const maxBar = Math.max(...bars);
    return {
      source: 'explicit',
      hasBeatTiming: false,
      beatsPerBar: null,
      totalBars: Math.max(1, maxBar - minBar + 1),
      barStartEventIndexes,
    };
  }

  const durations = melody.events.map((event) => getEventDurationBeats(event));
  const hasBeatTiming = durations.every((duration) => duration !== null);
  if (!hasBeatTiming || durations.length === 0) {
    return {
      source: 'none',
      hasBeatTiming: false,
      beatsPerBar: null,
      totalBars: null,
      barStartEventIndexes: new Set<number>(),
    };
  }

  const beatsPerBar = DEFAULT_TIMELINE_BEATS_PER_BAR;
  const barStartEventIndexes = new Set<number>();
  const epsilon = 1e-6;
  let accumulatedBeats = 0;

  for (let eventIndex = 0; eventIndex < durations.length; eventIndex++) {
    if (eventIndex > 0) {
      const remainder = ((accumulatedBeats % beatsPerBar) + beatsPerBar) % beatsPerBar;
      if (remainder < epsilon || Math.abs(remainder - beatsPerBar) < epsilon) {
        barStartEventIndexes.add(eventIndex);
      }
    }
    accumulatedBeats += durations[eventIndex]!;
  }

  const totalBars = Math.max(1, Math.ceil((accumulatedBeats + epsilon) / beatsPerBar));
  return {
    source: 'duration',
    hasBeatTiming: true,
    beatsPerBar,
    totalBars,
    barStartEventIndexes,
  };
}

function getClassicCellTextRaw(notes: TimelineNoteChip[]) {
  if (notes.length === 0) return '';
  return notes.map((note) => String(note.fret)).join('/');
}

function getClassicCellText(notes: TimelineNoteChip[], width: number) {
  const raw = getClassicCellTextRaw(notes);
  if (!raw) return '-'.repeat(width);
  if (raw.length >= width) return raw;
  return `${raw}${'-'.repeat(width - raw.length)}`;
}

function parseScientificNoteToMidiValue(noteWithOctave: string) {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(noteWithOctave.trim());
  if (!match) return null;
  const [, letter, sharp, octaveText] = match;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  const baseByLetter: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = baseByLetter[letter];
  if (!Number.isFinite(base)) return null;
  return (octave + 1) * 12 + base + (sharp ? 1 : 0);
}

function resolveEquivalentTimelineDragFret(
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  sourceStringName: string,
  sourceFret: number,
  targetStringName: string
) {
  if (targetStringName === sourceStringName) return sourceFret;
  const sourceScientific = instrument.getNoteWithOctave(sourceStringName, sourceFret);
  if (!sourceScientific) return null;
  const targetMidi = parseScientificNoteToMidiValue(sourceScientific);
  if (targetMidi === null) return null;

  for (let fret = 0; fret <= 24; fret += 1) {
    const candidate = instrument.getNoteWithOctave(targetStringName, fret);
    if (!candidate) continue;
    if (parseScientificNoteToMidiValue(candidate) === targetMidi) {
      return fret;
    }
  }
  return null;
}

function clearTimelineNoteDragPreview() {
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-note-drag-preview')
    .forEach((element) => {
      element.classList.remove('timeline-note-drag-preview');
      element.style.removeProperty('--timeline-drag-preview-color');
      delete element.dataset.timelineDragPreviewFret;
    });
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-note-drag-target-chip')
    .forEach((element) => element.remove());
}

function clearTimelineEventDragPreview() {
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-event-drag-source, .timeline-event-drag-target')
    .forEach((element) => {
      element.classList.remove('timeline-event-drag-source', 'timeline-event-drag-target');
    });
}

function markTimelineEventDragPreview(sourceEventIndex: number, targetEventIndex: number) {
  clearTimelineEventDragPreview();
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>(`[data-event-index="${sourceEventIndex}"]`)
    .forEach((element) => {
      element.classList.add('timeline-event-drag-source');
    });
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>(`[data-event-index="${targetEventIndex}"]`)
    .forEach((element) => {
      element.classList.add('timeline-event-drag-target');
    });
}

function bindTimelineEventDrag(
  dragTarget: HTMLElement,
  payload: { melodyId: string; sourceEventIndex: number; selectedEventIndex: number | null }
) {
  dragTarget.dataset.timelineNoPan = 'true';

  dragTarget.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    const pointerId = event.pointerId;
    const originalTarget = event.target as HTMLElement | null;
    if (originalTarget?.closest('[data-note-index]')) return;
    if (payload.selectedEventIndex !== payload.sourceEventIndex) return;
    event.preventDefault();

    const metrics = getRenderedTimelineStepMetrics(dom.melodyTabTimelineGrid);
    if (metrics.length === 0) return;

    let hasMoved = false;
    let lastTargetIndex = payload.sourceEventIndex;

    const resolveTargetEventIndex = (clientX: number) => {
      const gridRect = dom.melodyTabTimelineGrid.getBoundingClientRect();
      const offsetX = clientX - gridRect.left + dom.melodyTabTimelineGrid.scrollLeft;
      const metric =
        metrics.find((candidate) => offsetX >= candidate.left && offsetX <= candidate.right) ??
        metrics.reduce<TimelineStepMetric | null>((best, candidate) => {
          if (!best) return candidate;
          const bestCenter = (best.left + best.right) / 2;
          const candidateCenter = (candidate.left + candidate.right) / 2;
          return Math.abs(offsetX - candidateCenter) < Math.abs(offsetX - bestCenter) ? candidate : best;
        }, null);
      return metric?.index ?? payload.sourceEventIndex;
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      hasMoved = true;
      const targetEventIndex = resolveTargetEventIndex(moveEvent.clientX);
      if (targetEventIndex !== lastTargetIndex) {
        lastTargetIndex = targetEventIndex;
        markTimelineEventDragPreview(payload.sourceEventIndex, targetEventIndex);
      }
      moveEvent.preventDefault();
    };

    const finish = (finishEvent: PointerEvent, commit: boolean) => {
      if (finishEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      if (commit && hasMoved) {
        const targetEventIndex = resolveTargetEventIndex(finishEvent.clientX);
        onMelodyTimelineEventDrag?.({
          melodyId: payload.melodyId,
          sourceEventIndex: payload.sourceEventIndex,
          targetEventIndex,
          commit: true,
        });
      }
      clearTimelineEventDragPreview();
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      finish(upEvent, true);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      finish(cancelEvent, false);
    };

    markTimelineEventDragPreview(payload.sourceEventIndex, payload.sourceEventIndex);
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerCancel, true);
  });
}

function clearTimelineNoteDragSource() {
  activeTimelineNoteDragSource = null;
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>('.timeline-note-drag-source')
    .forEach((element) => {
      element.classList.remove('timeline-note-drag-source');
    });
}

function markTimelineNoteDragSource(eventIndex: number, noteIndex: number) {
  activeTimelineNoteDragSource = { eventIndex, noteIndex };
  clearTimelineNoteDragSource();
  activeTimelineNoteDragSource = { eventIndex, noteIndex };
  dom.melodyTabTimelineGrid
    .querySelectorAll<HTMLElement>(`[data-event-index="${eventIndex}"][data-note-index="${noteIndex}"]`)
    .forEach((element) => {
      element.classList.add('timeline-note-drag-source');
    });
}

function setTimelineNoteDragPreview(stringName: string, eventIndex: number, color: string, previewFret: number | null) {
  clearTimelineNoteDragPreview();
  const rowElements = Array.from(
    dom.melodyTabTimelineGrid.querySelectorAll<HTMLElement>('[data-timeline-string-name]')
  ).filter((element) => element.dataset.timelineStringName === stringName);

  rowElements.forEach((rowElement) => {
    rowElement
      .querySelectorAll<HTMLElement>(`[data-event-index="${eventIndex}"]:not([data-note-index])`)
      .forEach((cellElement) => {
        cellElement.classList.add('timeline-note-drag-preview');
        cellElement.style.setProperty('--timeline-drag-preview-color', color);
        if (previewFret !== null) {
          cellElement.dataset.timelineDragPreviewFret = String(previewFret);
          const targetChip = document.createElement('span');
          targetChip.className = 'timeline-note-drag-target-chip';
          targetChip.textContent = String(previewFret);
          targetChip.style.backgroundColor = color;
          cellElement.appendChild(targetChip);
        }
      });
  });
}

function bindTimelineNoteDrag(noteTarget: HTMLElement, payload: {
  melodyId: string;
  eventIndex: number;
  noteIndex: number;
  stringName: string;
  fret: number;
}, instrument: Pick<IInstrument, 'getNoteWithOctave'>) {
  noteTarget.dataset.timelineNoPan = 'true';
  noteTarget.style.cursor = 'grab';

  noteTarget.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    event.preventDefault();

    const pointerId = event.pointerId;
    let lastStringName: string | null = null;
    let hasMoved = false;
    const computedStyle = window.getComputedStyle(noteTarget);
    const previewColor =
      computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ? computedStyle.backgroundColor
        : computedStyle.color || '#67e8f9';

    onMelodyTimelineNoteSelect?.(payload);
    markTimelineNoteDragSource(payload.eventIndex, payload.noteIndex);
    document.body.classList.add('timeline-note-drag-active');

    const resolveStringName = (_clientX: number, clientY: number) => {
      const rows = Array.from(
        dom.melodyTabTimelineGrid.querySelectorAll<HTMLElement>('[data-timeline-string-name]')
      );
      if (rows.length === 0) return null;

      let bestRow: HTMLElement | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(clientY - centerY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestRow = row;
        }
      });

      return bestRow?.dataset.timelineStringName ?? null;
    };

    const updateHoverTarget = (clientX: number, clientY: number, commit: boolean) => {
      const stringName = resolveStringName(clientX, clientY);
      if (!stringName) {
        lastStringName = null;
        clearTimelineNoteDragPreview();
        return;
      }
      if (stringName !== lastStringName) {
        lastStringName = stringName;
        setTimelineNoteDragPreview(
          stringName,
          payload.eventIndex,
          previewColor,
          resolveEquivalentTimelineDragFret(instrument, payload.stringName, payload.fret, stringName)
        );
      }
      if (commit) {
        onMelodyTimelineNoteDrag?.({
          ...payload,
          stringName,
          commit: true,
        });
      }
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      hasMoved = true;
      noteTarget.style.cursor = 'grabbing';
      window.getSelection()?.removeAllRanges();
      updateHoverTarget(moveEvent.clientX, moveEvent.clientY, false);
      moveEvent.preventDefault();
    };

    const finish = (upEvent: PointerEvent, commit: boolean) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('pointercancel', handlePointerCancel, true);
      noteTarget.style.cursor = 'grab';
      clearTimelineNoteDragSource();
      document.body.classList.remove('timeline-note-drag-active');
      if (commit && hasMoved) {
        updateHoverTarget(upEvent.clientX, upEvent.clientY, true);
      }
      clearTimelineNoteDragPreview();
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      finish(upEvent, true);
    };

    const handlePointerCancel = (cancelEvent: PointerEvent) => {
      finish(cancelEvent, false);
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('pointercancel', handlePointerCancel, true);
  });
}

function renderGridTimeline(
  melodyId: string,
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  model: ReturnType<typeof buildMelodyTabTimelineViewModel>,
  barGrouping: TimelineBarGrouping,
  durationLayout: TimelineDurationLayout,
  root: HTMLElement,
  showStepNumbers: boolean,
  selectedEventIndex: number | null,
  selectedNoteIndex: number | null
) {
  const table = document.createElement('table');
  table.className = 'min-w-max border-separate border-spacing-px text-[10px] font-mono text-slate-200';

  if (showStepNumbers) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className =
      'sticky left-0 z-[3] bg-slate-900/95 text-slate-300 px-1.5 py-0.5 border border-slate-600 rounded text-left';
    corner.textContent = 'Str';
    headerRow.appendChild(corner);

    for (let eventIndex = 0; eventIndex < model.totalEvents; eventIndex++) {
      const widthPx = durationLayout.cellPixelWidths[eventIndex] ?? 28;
      const step = document.createElement('th');
      step.dataset.eventIndex = String(eventIndex);
      const rangeCell = model.rows[0]?.cells[eventIndex] ?? null;
      const isInStudyRange = rangeCell?.isInStudyRange ?? false;
      const accentColor = getPrimaryCellFingerColor(rangeCell?.notes ?? []);
      step.className =
        'px-1.5 py-0.5 border rounded text-center whitespace-nowrap ' +
        (model.activeEventIndex === eventIndex
          ? 'text-slate-50'
          : isInStudyRange
            ? 'border-amber-600/70 bg-amber-900/20 text-amber-100'
            : 'border-slate-600 bg-slate-800/55 text-slate-500');
      step.style.minWidth = `${widthPx}px`;
      step.style.width = `${widthPx}px`;
      if (model.activeEventIndex === eventIndex) {
        step.style.borderColor = withAlpha(accentColor, 0.88);
        step.style.backgroundColor = withAlpha(accentColor, 0.26);
        step.style.boxShadow = `inset 0 0 0 1px ${withAlpha(accentColor, 0.18)}`;
      }
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        step.style.borderLeftWidth = '2px';
        step.style.borderLeftColor = model.activeEventIndex === eventIndex ? accentColor : '#94a3b8';
      }
      step.textContent = String(eventIndex + 1);
      headerRow.appendChild(step);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  const tbody = document.createElement('tbody');
  model.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    tr.dataset.timelineStringName = row.stringName;
    const label = document.createElement('th');
    label.className =
      'sticky left-0 z-[2] bg-slate-900/95 text-cyan-200 px-1.5 py-0.5 border border-slate-600 rounded text-left';
    label.textContent = row.stringName;
    tr.appendChild(label);

    row.cells.forEach((cell, eventIndex) => {
      const widthPx = durationLayout.cellPixelWidths[eventIndex] ?? 28;
      const accentColor = getPrimaryCellFingerColor(cell.notes);
      const td = document.createElement('td');
      td.dataset.eventIndex = String(eventIndex);
      if (rowIndex === 0) {
        td.dataset.timelineStepAnchor = 'true';
      }
      td.className =
        'h-6 border rounded text-center align-middle ' +
        (cell.isActive
          ? ''
          : cell.isInStudyRange
            ? 'border-amber-700/60 bg-amber-950/20'
            : 'border-slate-700/70 bg-slate-900/25 opacity-70');
      td.style.minWidth = `${widthPx}px`;
      td.style.width = `${widthPx}px`;
      if (cell.isActive) {
        td.style.borderColor = withAlpha(accentColor, 0.88);
        td.style.backgroundColor = withAlpha(accentColor, 0.16);
        td.style.boxShadow = `inset 0 0 0 1px ${withAlpha(accentColor, 0.18)}`;
      }
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        td.style.borderLeftWidth = '2px';
        td.style.borderLeftColor = cell.isActive ? accentColor : '#94a3b8';
      }
      if (cell.isStudyRangeStart) {
        td.style.boxShadow = 'inset 2px 0 0 rgba(251, 191, 36, 0.9)';
      }
      if (cell.isStudyRangeEnd) {
        td.style.boxShadow = td.style.boxShadow
          ? `${td.style.boxShadow}, inset -2px 0 0 rgba(251, 191, 36, 0.9)`
          : 'inset -2px 0 0 rgba(251, 191, 36, 0.9)';
      }

      if (cell.notes.length === 0) {
        const empty = document.createElement('span');
        empty.className = cell.isActive
          ? ''
          : cell.isInStudyRange
            ? 'text-amber-200/50'
            : 'text-slate-600';
        if (cell.isActive) {
          empty.style.color = withAlpha(accentColor, 0.84);
        }
        empty.textContent = '.';
        td.appendChild(empty);
      } else if (cell.notes.length === 1) {
        const noteChip = createCellNoteChip(cell.notes[0]);
        const isSelected = selectedEventIndex === eventIndex && selectedNoteIndex === cell.notes[0]!.noteIndex;
        const isDragSource =
          activeTimelineNoteDragSource?.eventIndex === eventIndex &&
          activeTimelineNoteDragSource?.noteIndex === cell.notes[0]!.noteIndex;
        noteChip.dataset.eventIndex = String(eventIndex);
        noteChip.dataset.noteIndex = String(cell.notes[0]!.noteIndex);
        if (isSelected) {
          noteChip.style.outline = `1px solid ${withAlpha(getFingerColor(cell.notes[0]!.finger), 0.92)}`;
          noteChip.style.boxShadow = `0 0 0 1px ${withAlpha(getFingerColor(cell.notes[0]!.finger), 0.28)}`;
        }
        if (isDragSource) {
          noteChip.classList.add('timeline-note-drag-source');
        }
        noteChip.addEventListener('click', () => {
          onMelodyTimelineNoteSelect?.({ melodyId, eventIndex, noteIndex: cell.notes[0]!.noteIndex });
        });
        bindTimelineNoteDrag(noteChip, {
          melodyId,
          eventIndex,
          noteIndex: cell.notes[0]!.noteIndex,
          stringName: cell.notes[0]!.stringName,
          fret: cell.notes[0]!.fret,
        }, instrument);
        td.appendChild(noteChip);
      } else {
        const stack = document.createElement('div');
        stack.className = 'flex flex-col items-center justify-center gap-px py-0';
        cell.notes.forEach((note) => {
          const noteChip = createCellNoteChip(note);
          const isSelected = selectedEventIndex === eventIndex && selectedNoteIndex === note.noteIndex;
          const isDragSource =
            activeTimelineNoteDragSource?.eventIndex === eventIndex &&
            activeTimelineNoteDragSource?.noteIndex === note.noteIndex;
          noteChip.dataset.eventIndex = String(eventIndex);
          noteChip.dataset.noteIndex = String(note.noteIndex);
          if (isSelected) {
            noteChip.style.outline = `1px solid ${withAlpha(getFingerColor(note.finger), 0.92)}`;
            noteChip.style.boxShadow = `0 0 0 1px ${withAlpha(getFingerColor(note.finger), 0.28)}`;
          }
          if (isDragSource) {
            noteChip.classList.add('timeline-note-drag-source');
          }
          noteChip.addEventListener('click', () => {
            onMelodyTimelineNoteSelect?.({ melodyId, eventIndex, noteIndex: note.noteIndex });
          });
          bindTimelineNoteDrag(noteChip, {
            melodyId,
            eventIndex,
            noteIndex: note.noteIndex,
            stringName: note.stringName,
            fret: note.fret,
          }, instrument);
          stack.appendChild(noteChip);
        });
        td.appendChild(stack);
      }

      bindTimelineEventDrag(td, {
        melodyId,
        sourceEventIndex: eventIndex,
        selectedEventIndex,
      });

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  root.appendChild(table);
}

function renderClassicTimeline(
  melodyId: string,
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  model: ReturnType<typeof buildMelodyTabTimelineViewModel>,
  barGrouping: TimelineBarGrouping,
  durationLayout: TimelineDurationLayout,
  root: HTMLElement,
  showStepNumbers: boolean,
  selectedEventIndex: number | null,
  selectedNoteIndex: number | null
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-max text-[11px] leading-5 font-mono text-slate-200';

  const eventWidths = Array.from({ length: model.totalEvents }, (_, eventIndex) => {
    const durationWidth = durationLayout.cellCharWidths[eventIndex] ?? 3;
    const widestRaw = Math.max(
      0,
      ...model.rows.map((row) => getClassicCellTextRaw(row.cells[eventIndex]?.notes ?? []).length)
    );
    return Math.max(3, widestRaw, durationWidth);
  });

  const buildLine = (labelText: string, segments: string[], options?: { isHeader?: boolean; isAnchorRow?: boolean }) => {
    const isHeader = options?.isHeader ?? false;
    const isAnchorRow = options?.isAnchorRow ?? false;
    const line = document.createElement('div');
    line.className = 'flex items-center whitespace-nowrap';
    if (!isHeader) {
      line.dataset.timelineStringName = labelText;
    }

    const label = document.createElement('span');
    label.className = `inline-block w-7 shrink-0 ${isHeader ? 'text-slate-400' : 'text-cyan-200'}`;
    label.textContent = labelText;
    line.appendChild(label);

    const startPipe = document.createElement('span');
    startPipe.className = 'text-slate-500';
    startPipe.textContent = '|';
    line.appendChild(startPipe);

    segments.forEach((segment, eventIndex) => {
      if (barGrouping.barStartEventIndexes.has(eventIndex)) {
        const barPipe = document.createElement('span');
        barPipe.className = 'text-slate-500';
        barPipe.textContent = '|';
        line.appendChild(barPipe);
      }

      const cell = document.createElement('span');
      cell.dataset.eventIndex = String(eventIndex);
      if (isAnchorRow) {
        cell.dataset.timelineStepAnchor = 'true';
      }
      const rangeCell = model.rows[0]?.cells[eventIndex] ?? null;
      const accentColor = getPrimaryCellFingerColor(rangeCell?.notes ?? []);
      cell.className =
        'inline-block px-[1px] rounded-sm ' +
        (model.activeEventIndex === eventIndex
          ? 'text-slate-50'
          : rangeCell?.isInStudyRange
            ? 'bg-amber-900/25 text-amber-100'
          : isHeader
            ? 'text-slate-500'
            : 'text-slate-500');
      cell.style.minWidth = `${eventWidths[eventIndex]}ch`;
      cell.style.width = `${eventWidths[eventIndex]}ch`;
      if (model.activeEventIndex === eventIndex) {
        cell.style.backgroundColor = withAlpha(accentColor, 0.28);
        cell.style.color = '#f8fafc';
      }
      const selectedRowNote = model.rows.find((row) => row.stringName === labelText)?.cells[eventIndex]?.notes[0] ?? null;
      const isDragSource =
        !isHeader &&
        selectedRowNote &&
        activeTimelineNoteDragSource?.eventIndex === eventIndex &&
        activeTimelineNoteDragSource?.noteIndex === selectedRowNote.noteIndex;
      if (
        !isHeader &&
        selectedRowNote &&
        selectedEventIndex === eventIndex &&
        selectedNoteIndex === selectedRowNote.noteIndex
      ) {
        cell.style.outline = `1px solid ${withAlpha(getFingerColor(selectedRowNote.finger), 0.92)}`;
        cell.style.boxShadow = `0 0 0 1px ${withAlpha(getFingerColor(selectedRowNote.finger), 0.28)}`;
      }
      if (rangeCell?.isStudyRangeStart) {
        cell.style.boxShadow = 'inset 2px 0 0 rgba(251, 191, 36, 0.9)';
      }
      if (rangeCell?.isStudyRangeEnd) {
        cell.style.boxShadow = cell.style.boxShadow
          ? `${cell.style.boxShadow}, inset -2px 0 0 rgba(251, 191, 36, 0.9)`
          : 'inset -2px 0 0 rgba(251, 191, 36, 0.9)';
      }
      if (isDragSource) {
        cell.classList.add('timeline-note-drag-source');
      }
      cell.textContent = segment;
      if (!isHeader && selectedRowNote) {
        cell.dataset.timelineNoPan = 'true';
        cell.dataset.noteIndex = String(selectedRowNote.noteIndex);
        cell.addEventListener('click', () => {
          onMelodyTimelineNoteSelect?.({ melodyId, eventIndex, noteIndex: selectedRowNote.noteIndex });
        });
        bindTimelineNoteDrag(cell, {
          melodyId,
          eventIndex,
          noteIndex: selectedRowNote.noteIndex,
          stringName: selectedRowNote.stringName,
          fret: selectedRowNote.fret,
        }, instrument);
      }
      if (!isHeader) {
        bindTimelineEventDrag(cell, {
          melodyId,
          sourceEventIndex: eventIndex,
          selectedEventIndex,
        });
      }
      line.appendChild(cell);
    });

    const endPipe = document.createElement('span');
    endPipe.className = 'text-slate-500';
    endPipe.textContent = '|';
    line.appendChild(endPipe);

    return line;
  };

  if (showStepNumbers) {
    const headerSegments = eventWidths.map((width, eventIndex) => String(eventIndex + 1).padEnd(width, ' '));
    wrapper.appendChild(buildLine('Stp', headerSegments, { isHeader: true }));
  }

  model.rows.forEach((row, rowIndex) => {
    const segments = row.cells.map((cell, eventIndex) => getClassicCellText(cell.notes, eventWidths[eventIndex]));
    wrapper.appendChild(buildLine(row.stringName, segments, { isAnchorRow: rowIndex === 0 }));
  });

  root.appendChild(wrapper);
}

function getRenderedTimelineStepMetrics(root: HTMLElement): TimelineStepMetric[] {
  const wrapperRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll<HTMLElement>('[data-timeline-step-anchor="true"]')).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      index: Number.parseInt(element.dataset.eventIndex ?? '0', 10) || 0,
      left: rect.left - wrapperRect.left,
      right: rect.right - wrapperRect.left,
    };
  });
}

function renderStudyRangeBar(
  root: HTMLElement,
  melodyId: string,
  totalEvents: number,
  metrics: TimelineStepMetric[],
  studyRange: MelodyStudyRange
) {
  if (metrics.length === 0 || totalEvents <= 0) return;

  const normalizedRange = normalizeMelodyStudyRange(studyRange, totalEvents);
  const totalWidth = Math.max(0, metrics[metrics.length - 1]!.right);
  const trackStart = metrics[0]!.left;
  const trackEnd = metrics[metrics.length - 1]!.right;
  const trackWidth = Math.max(1, trackEnd - trackStart);

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-2 min-w-max select-none';

  const lane = document.createElement('div');
  lane.className = 'relative h-8';
  lane.style.width = `${totalWidth}px`;
  wrapper.appendChild(lane);

  const track = document.createElement('div');
  track.className = 'absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800 border border-slate-700/80';
  track.style.left = `${trackStart}px`;
  track.style.width = `${trackWidth}px`;
  lane.appendChild(track);

  const selection = document.createElement('div');
  selection.className =
    'absolute top-1/2 h-4 -translate-y-1/2 rounded-full border border-amber-400/80 bg-amber-500/20 shadow-[0_0_0_1px_rgba(251,191,36,0.15)] cursor-grab';
  selection.style.touchAction = 'none';
  selection.dataset.timelineNoPan = 'true';
  lane.appendChild(selection);

  const createHandle = (side: 'left' | 'right') => {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className =
      'absolute top-1/2 h-6 w-3 -translate-y-1/2 rounded-sm border border-amber-300/80 bg-amber-200 text-[0] shadow-sm cursor-ew-resize';
    handle.style.touchAction = 'none';
    handle.dataset.timelineNoPan = 'true';
    handle.setAttribute('aria-label', side === 'left' ? 'Adjust study range start' : 'Adjust study range end');
    lane.appendChild(handle);
    return handle;
  };

  const leftHandle = createHandle('left');
  const rightHandle = createHandle('right');

  const applyVisualRange = (range: MelodyStudyRange) => {
    const startMetric = metrics[range.startIndex] ?? metrics[0]!;
    const endMetric = metrics[range.endIndex] ?? metrics[metrics.length - 1]!;
    const left = startMetric.left;
    const width = Math.max(12, endMetric.right - startMetric.left);
    selection.style.left = `${left}px`;
    selection.style.width = `${width}px`;
    leftHandle.style.left = `${startMetric.left - 6}px`;
    rightHandle.style.left = `${endMetric.right - 6}px`;
  };

  applyVisualRange(normalizedRange);

  const startDrag = (mode: MelodyStudyRangeDragMode, event: PointerEvent) => {
    event.preventDefault();
    const pointerX = event.clientX - root.getBoundingClientRect().left;
    const anchorIndex = resolveTimelineStepIndexFromX(metrics, pointerX);
    const anchorOffset = anchorIndex - normalizedRange.startIndex;
    let previewRange = normalizedRange;

    selection.classList.add('cursor-grabbing');

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const x = moveEvent.clientX - root.getBoundingClientRect().left;
      const hoveredIndex = resolveTimelineStepIndexFromX(metrics, x);
      previewRange = computeDraggedMelodyStudyRange(
        mode,
        normalizedRange,
        hoveredIndex,
        totalEvents,
        mode === 'move' ? anchorOffset : 0
      );
      applyVisualRange(previewRange);
    };

    const finishDrag = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      selection.classList.remove('cursor-grabbing');
      applyVisualRange(previewRange);
      if (
        previewRange.startIndex !== normalizedRange.startIndex ||
        previewRange.endIndex !== normalizedRange.endIndex
      ) {
        onMelodyStudyRangeCommit?.({ melodyId, range: previewRange });
      }
    };

    const handlePointerUp = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  leftHandle.addEventListener('pointerdown', (event) => startDrag('start', event));
  rightHandle.addEventListener('pointerdown', (event) => startDrag('end', event));
  selection.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target === leftHandle || target === rightHandle) return;
    startDrag('move', event);
  });

  root.prepend(wrapper);
}

function renderTimelineMinimap(
  melody: MelodyDefinition,
  stringOrder: string[],
  activeEventIndex: number | null,
  durationLayout: TimelineDurationLayout,
  studyRange: MelodyStudyRange,
  options: { showRangeEditor: boolean }
) {
  dom.melodyTabTimelineMinimap.innerHTML = '';
  if (durationLayout.weights.length === 0 || melody.events.length === 0) {
    dom.melodyTabTimelineMinimap.classList.add('hidden');
    return;
  }

  const layout = buildMelodyMinimapLayout(
    melody,
    stringOrder,
    durationLayout.weights,
    activeEventIndex,
    studyRange
  );
  const normalizedStudyRange = normalizeMelodyStudyRange(studyRange, layout.eventSegments.length);

  const shell = document.createElement('div');
  shell.className = 'timeline-minimap-shell';
  shell.dataset.cursor = options.showRangeEditor ? 'range' : 'seek';
  shell.title = options.showRangeEditor
    ? 'Timeline minimap. Click or drag to seek. Drag the yellow handles to set the study range.'
    : 'Timeline minimap. Click or drag to seek through the melody.';
  shell.setAttribute('aria-label', shell.title);

  const track = document.createElement('div');
  track.className = 'timeline-minimap-track';
  shell.appendChild(track);

  if (layout.activeRatio !== null) {
    const progressFill = document.createElement('div');
    progressFill.className = 'timeline-minimap-progress-fill';
    progressFill.style.width = `${layout.activeRatio * 100}%`;
    track.appendChild(progressFill);
  }

  const rowHeightPercent = 100 / layout.rowCount;
  layout.noteRects.forEach((noteRect) => {
    const element = document.createElement('span');
    element.className = 'timeline-minimap-note' + (noteRect.isInStudyRange ? ' is-study' : '');
    const fingerColor = getFingerColor(noteRect.finger);
    element.style.left = `${noteRect.startRatio * 100}%`;
    element.style.width = `${Math.max(0.28, noteRect.widthRatio * 100)}%`;
    element.style.top = `calc(${noteRect.rowIndex * rowHeightPercent}% + 2px)`;
    element.style.height = `max(3px, calc(${rowHeightPercent}% - 4px))`;
    element.style.backgroundColor = withAlpha(
      fingerColor,
      noteRect.isInStudyRange ? 0.8 : 0.58
    );
    track.appendChild(element);
  });

  const rangeStartSegment =
    layout.eventSegments[normalizedStudyRange.startIndex] ?? layout.eventSegments[0]!;
  const rangeEndSegment =
    layout.eventSegments[normalizedStudyRange.endIndex] ??
    layout.eventSegments[layout.eventSegments.length - 1]!;
  let previewRange = normalizedStudyRange;

  const rangeStartShade = document.createElement('div');
  const rangeEndShade = document.createElement('div');
  const rangeStartLine = document.createElement('div');
  const rangeEndLine = document.createElement('div');
  const startHandle = document.createElement('div');
  const endHandle = document.createElement('div');

  if (options.showRangeEditor) {
    rangeStartShade.className = 'timeline-minimap-outside-range';
    rangeEndShade.className = 'timeline-minimap-outside-range';
    rangeStartLine.className = 'timeline-minimap-range-line';
    rangeEndLine.className = 'timeline-minimap-range-line';
    startHandle.className = 'timeline-minimap-handle';
    endHandle.className = 'timeline-minimap-handle';
    startHandle.dataset.dragMode = 'start';
    endHandle.dataset.dragMode = 'end';
    track.append(
      rangeStartShade,
      rangeEndShade,
      rangeStartLine,
      rangeEndLine,
      startHandle,
      endHandle
    );
  }

  const applyRangeVisuals = (range: MelodyStudyRange) => {
    if (!options.showRangeEditor) return;
    const startSegment = layout.eventSegments[range.startIndex] ?? rangeStartSegment;
    const endSegment = layout.eventSegments[range.endIndex] ?? rangeEndSegment;
    rangeStartShade.style.left = '0';
    rangeStartShade.style.width = `${startSegment.startRatio * 100}%`;
    rangeEndShade.style.left = `${endSegment.endRatio * 100}%`;
    rangeEndShade.style.width = `${Math.max(0, 1 - endSegment.endRatio) * 100}%`;
    rangeStartLine.style.left = `${startSegment.startRatio * 100}%`;
    rangeEndLine.style.left = `${endSegment.endRatio * 100}%`;
    startHandle.style.left = `${startSegment.startRatio * 100}%`;
    endHandle.style.left = `${endSegment.endRatio * 100}%`;
  };

  applyRangeVisuals(normalizedStudyRange);

  if (layout.activeRatio !== null) {
    const playhead = document.createElement('div');
    playhead.className = 'timeline-minimap-playhead';
    playhead.style.left = `${layout.activeRatio * 100}%`;
    track.appendChild(playhead);
  }

  const resolveSeekTargetIndex = (clientX: number) => {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const ratio = (clientX - rect.left) / rect.width;
    return resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, ratio);
  };

  type MinimapDragMode = 'seek' | 'start' | 'end';
  let pointerId: number | null = null;
  let dragMode: MinimapDragMode | null = null;

  const resolveDragMode = (event: PointerEvent): MinimapDragMode => {
    if (!options.showRangeEditor) return 'seek';
    const explicitMode = (event.target as HTMLElement | null)?.dataset.dragMode;
    if (explicitMode === 'start' || explicitMode === 'end') return explicitMode;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 'seek';
    const ratio = (event.clientX - rect.left) / rect.width;
    const threshold = 12 / rect.width;
    if (Math.abs(ratio - layout.rangeStartRatio) <= threshold) return 'start';
    if (Math.abs(ratio - layout.rangeEndRatio) <= threshold) return 'end';
    return 'seek';
  };

  const updateFromPointer = (event: PointerEvent, commit: boolean) => {
    if (!dragMode) return;
    if (dragMode === 'seek') {
      const targetIndex = resolveSeekTargetIndex(event.clientX);
      if (typeof targetIndex !== 'number') return;
      if (commit) {
        onMelodyTimelineSeek?.({ melodyId: melody.id, eventIndex: targetIndex, commit: true });
      } else {
        centerTimelineEvent(targetIndex, 'auto');
      }
      return;
    }
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const hoveredIndex = resolveMelodyMinimapEventIndexFromRatio(layout.eventSegments, ratio);
    previewRange = normalizeMelodyStudyRange(
      dragMode === 'start'
        ? {
            startIndex: Math.min(hoveredIndex, normalizedStudyRange.endIndex),
            endIndex: normalizedStudyRange.endIndex,
          }
        : {
            startIndex: normalizedStudyRange.startIndex,
            endIndex: Math.max(hoveredIndex, normalizedStudyRange.startIndex),
          },
      layout.eventSegments.length
    );
    applyRangeVisuals(previewRange);
    if (commit) {
      onMelodyStudyRangeCommit?.({ melodyId: melody.id, range: previewRange });
    }
  };

  const finishDrag = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    if (shell.hasPointerCapture(event.pointerId)) {
      shell.releasePointerCapture(event.pointerId);
    }
    const shouldCommit = dragMode === 'seek' || dragMode === 'start' || dragMode === 'end';
    updateFromPointer(event, shouldCommit);
    pointerId = null;
    dragMode = null;
    shell.classList.remove('is-scrubbing');
  };

  shell.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    dragMode = resolveDragMode(event);
    shell.classList.add('is-scrubbing');
    shell.setPointerCapture(event.pointerId);
    updateFromPointer(event, false);
    event.preventDefault();
  });

  shell.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) {
      if (options.showRangeEditor) {
        shell.dataset.cursor = resolveDragMode(event) === 'seek' ? 'seek' : 'range';
      }
      return;
    }
    updateFromPointer(event, false);
    event.preventDefault();
  });

  shell.addEventListener('pointerup', finishDrag);
  shell.addEventListener('pointercancel', finishDrag);

  dom.melodyTabTimelineMinimap.classList.remove('hidden');
  dom.melodyTabTimelineMinimap.appendChild(shell);
}

export function hideMelodyTabTimeline() {
  dom.melodyTabTimelinePanel.classList.add('hidden');
  dom.melodyTabTimelineMinimap.classList.add('hidden');
  dom.melodyTabTimelineMinimap.innerHTML = '';
  dom.melodyTabTimelineMeta.classList.add('hidden');
  dom.melodyTabTimelineMeta.textContent = '';
  dom.melodyTabTimelineGrid.dataset.activeEventIndex = '';
  dom.melodyTabTimelineViewport.dataset.scrollable = 'false';
  dom.melodyTabTimelineViewport.dataset.scrollLeft = 'false';
  dom.melodyTabTimelineViewport.dataset.scrollRight = 'false';
  clearGrid();
  lastRenderKey = '';
}

export function renderMelodyTabTimeline(
  melody: MelodyDefinition,
  instrument: Pick<IInstrument, 'STRING_ORDER' | 'getNoteWithOctave'>,
  activeEventIndex: number | null,
  options: {
    modeLabel?: string | null;
    viewMode?: 'classic' | 'grid';
    studyRange?: MelodyStudyRange | null;
    showStepNumbers?: boolean;
    showMetaDetails?: boolean;
    minimapRangeEditor?: boolean;
    selectedEventIndex?: number | null;
    selectedNoteIndex?: number | null;
  } = {}
) {
  const modeLabel = options.modeLabel?.trim() ?? '';
  const viewMode = options.viewMode ?? 'classic';
  const showStepNumbers = options.showStepNumbers ?? false;
  const showMetaDetails = options.showMetaDetails ?? false;
  const minimapRangeEditor = options.minimapRangeEditor ?? true;
  const selectedEventIndex = options.selectedEventIndex ?? null;
  const selectedNoteIndex = options.selectedNoteIndex ?? null;
  const studyRange = normalizeMelodyStudyRange(options.studyRange, melody.events.length);
  bindTimelineScrollChrome();
  bindTimelineDragPan();
  const model = buildMelodyTabTimelineViewModel(melody, instrument.STRING_ORDER, activeEventIndex, studyRange);
  const barGrouping = buildTimelineBarGrouping(melody);
  const durationLayout = computeTimelineDurationLayout(melody);
  const durationSignature = durationLayout.weights
    .map((weight, index) => `${index}:${Math.round(weight * 100)}`)
    .join(',');
  const melodyContentSignature = buildMelodyContentSignature(melody);
  const renderKey = [
    melody.id,
    melody.events.length,
    melodyContentSignature,
    model.activeEventIndex ?? -1,
    modeLabel,
    viewMode,
    barGrouping.source,
    barGrouping.totalBars ?? -1,
    barGrouping.hasBeatTiming ? 1 : 0,
    durationLayout.source,
    durationSignature,
    studyRange.startIndex,
    studyRange.endIndex,
    showStepNumbers ? 1 : 0,
    minimapRangeEditor ? 1 : 0,
    selectedEventIndex ?? -1,
    selectedNoteIndex ?? -1,
    activeTimelineNoteDragSource?.eventIndex ?? -1,
    activeTimelineNoteDragSource?.noteIndex ?? -1,
    instrument.STRING_ORDER.join(','),
  ].join('|');
  if (renderKey === lastRenderKey && dom.melodyTabTimelineGrid.childElementCount > 0) {
    return;
  }
  lastRenderKey = renderKey;
  dom.melodyTabTimelineGrid.dataset.activeEventIndex =
    model.activeEventIndex === null ? '' : String(model.activeEventIndex);

  dom.melodyTabTimelinePanel.classList.remove('hidden');
  dom.melodyTabTimelineMeta.classList.toggle('hidden', !showMetaDetails);
  const stepText =
    model.activeEventIndex === null
      ? `Step -/${model.totalEvents}`
      : `Step ${model.activeEventIndex + 1}/${model.totalEvents}`;
  const viewLabel = viewMode === 'classic' ? 'Classic TAB' : 'Grid';
  const barText = (() => {
    if (typeof barGrouping.totalBars !== 'number') return '';
    const base = ` | ${barGrouping.totalBars} bar${barGrouping.totalBars === 1 ? '' : 's'}`;
    if (barGrouping.hasBeatTiming && typeof barGrouping.beatsPerBar === 'number') {
      return `${base} (${barGrouping.beatsPerBar}/4)`;
    }
    return base;
  })();
  const durationText = (() => {
    if (!durationLayout.hasDurationData) return '';
    if (durationLayout.source === 'beats') return ' | Duration: beat-scaled';
    if (durationLayout.source === 'columns') return ' | Duration: column-scaled';
    return ' | Duration: mixed';
  })();
  const studyRangeText = ` | Study: ${formatMelodyStudyRange(studyRange, melody.events.length)} (${getMelodyStudyRangeLength(studyRange, melody.events.length)} steps)`;
  dom.melodyTabTimelineMeta.textContent = showMetaDetails
    ? modeLabel
      ? `${modeLabel} | ${viewLabel} | ${stepText}${barText}${durationText}${studyRangeText}`
      : `${viewLabel} | ${stepText}${barText}${durationText}${studyRangeText}`
    : '';

  clearGrid();
  renderTimelineMinimap(melody, instrument.STRING_ORDER, model.activeEventIndex, durationLayout, studyRange, {
    showRangeEditor: minimapRangeEditor,
  });
  const content = document.createElement('div');
  content.className = 'relative min-w-max';
  dom.melodyTabTimelineGrid.appendChild(content);
  if (viewMode === 'grid') {
    renderGridTimeline(
      melody.id,
      instrument,
      model,
      barGrouping,
      durationLayout,
      content,
      showStepNumbers,
      selectedEventIndex,
      selectedNoteIndex
    );
  } else {
    renderClassicTimeline(
      melody.id,
      instrument,
      model,
      barGrouping,
      durationLayout,
      content,
      showStepNumbers,
      selectedEventIndex,
      selectedNoteIndex
    );
  }

  renderStudyRangeBar(content, melody.id, melody.events.length, getRenderedTimelineStepMetrics(content), studyRange);

  if (model.activeEventIndex !== null) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    centerTimelineEvent(model.activeEventIndex, prefersReducedMotion ? 'auto' : 'smooth');
  }

  updateTimelineScrollChrome();
  window.requestAnimationFrame(() => {
    updateTimelineScrollChrome();
  });
}
