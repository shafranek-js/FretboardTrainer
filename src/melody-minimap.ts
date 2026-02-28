import type { MelodyDefinition } from './melody-library';
import { buildMelodyFingeredEvents } from './melody-fingering';
import type { MelodyStudyRange } from './melody-study-range';
import { normalizeMelodyStudyRange } from './melody-study-range';

export interface MelodyMinimapEventSegment {
  index: number;
  startRatio: number;
  endRatio: number;
  isInStudyRange: boolean;
  isActive: boolean;
}

export interface MelodyMinimapNoteRect {
  eventIndex: number;
  startRatio: number;
  widthRatio: number;
  rowIndex: number;
  finger: number;
  isInStudyRange: boolean;
  isActive: boolean;
}

export interface MelodyMinimapLayout {
  eventSegments: MelodyMinimapEventSegment[];
  noteRects: MelodyMinimapNoteRect[];
  rangeStartRatio: number;
  rangeEndRatio: number;
  activeRatio: number | null;
  rowCount: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeStringName(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function resolveRowIndex(stringOrder: string[], stringName: string | null) {
  const normalizedStringName = normalizeStringName(stringName);
  const foundIndex = stringOrder.findIndex(
    (candidate) => normalizeStringName(candidate) === normalizedStringName
  );
  if (foundIndex >= 0) return foundIndex;
  return Math.max(0, Math.floor((stringOrder.length - 1) / 2));
}

export function buildMelodyMinimapLayout(
  melody: Pick<MelodyDefinition, 'events'>,
  stringOrder: string[],
  weights: number[],
  activeEventIndex: number | null,
  studyRange?: MelodyStudyRange | null
): MelodyMinimapLayout {
  const safeWeights = weights.map((weight) =>
    typeof weight === 'number' && Number.isFinite(weight) && weight > 0 ? weight : 1
  );
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0) || 1;
  const normalizedRange =
    safeWeights.length > 0 ? normalizeMelodyStudyRange(studyRange, safeWeights.length) : null;
  const rowCount = Math.max(1, stringOrder.length);
  const fingeredEvents = buildMelodyFingeredEvents(melody.events);

  let cursor = 0;
  const eventSegments: MelodyMinimapEventSegment[] = [];
  const noteRects: MelodyMinimapNoteRect[] = [];

  melody.events.forEach((event, index) => {
    const weight = safeWeights[index] ?? 1;
    const startRatio = cursor / totalWeight;
    cursor += weight;
    const endRatio = cursor / totalWeight;
    const isInStudyRange =
      normalizedRange !== null &&
      index >= normalizedRange.startIndex &&
      index <= normalizedRange.endIndex;
    const isActive = activeEventIndex === index;

    eventSegments.push({
      index,
      startRatio,
      endRatio,
      isInStudyRange,
      isActive,
    });

    const fingeredNotes = fingeredEvents[index] ?? [];
    event.notes.forEach((note, noteIndex) => {
      noteRects.push({
        eventIndex: index,
        startRatio,
        widthRatio: Math.max(0, endRatio - startRatio),
        rowIndex: resolveRowIndex(stringOrder, note.stringName),
        finger: fingeredNotes[noteIndex]?.finger ?? 0,
        isInStudyRange,
        isActive,
      });
    });
  });

  const firstSegment = eventSegments[0] ?? null;
  const lastSegment = eventSegments[eventSegments.length - 1] ?? null;
  const rangeStartSegment =
    normalizedRange !== null ? eventSegments[normalizedRange.startIndex] ?? firstSegment : firstSegment;
  const rangeEndSegment =
    normalizedRange !== null ? eventSegments[normalizedRange.endIndex] ?? lastSegment : lastSegment;
  const activeSegment =
    activeEventIndex !== null && activeEventIndex >= 0 ? eventSegments[activeEventIndex] ?? null : null;

  return {
    eventSegments,
    noteRects,
    rangeStartRatio: rangeStartSegment?.startRatio ?? 0,
    rangeEndRatio: rangeEndSegment?.endRatio ?? 1,
    activeRatio:
      activeSegment !== null
        ? activeSegment.startRatio + (activeSegment.endRatio - activeSegment.startRatio) / 2
        : null,
    rowCount,
  };
}

export function resolveMelodyMinimapEventIndexFromRatio(
  segments: MelodyMinimapEventSegment[],
  ratio: number
) {
  if (segments.length === 0) return 0;
  const clampedRatio = clamp(ratio, 0, 1);
  for (const segment of segments) {
    const midpoint = segment.startRatio + (segment.endRatio - segment.startRatio) / 2;
    if (clampedRatio <= midpoint) return segment.index;
  }
  return segments[segments.length - 1]!.index;
}
