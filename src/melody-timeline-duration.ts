import type { MelodyDefinition } from './melody-library';

export type TimelineDurationSource = 'beats' | 'columns' | 'mixed' | 'none';

export interface TimelineDurationLayout {
  source: TimelineDurationSource;
  hasDurationData: boolean;
  weights: number[];
  cellCharWidths: number[];
  cellPixelWidths: number[];
}

// Keep a wide safety envelope so beat-based timing stays musically accurate.
export const MELODY_PLAYBACK_MIN_STEP_MS = 40;
export const MELODY_PLAYBACK_MAX_STEP_MS = 12000;
export const MELODY_PLAYBACK_FALLBACK_STEP_MS = 700;
export const MELODY_PLAYBACK_COLUMN_MS = 95;
export const MELODY_PLAYBACK_MIN_BPM = 40;
export const MELODY_PLAYBACK_MAX_BPM = 220;
export const MELODY_PLAYBACK_DEFAULT_BPM = 90;

function normalizePositiveNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampMelodyPlaybackBpm(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return MELODY_PLAYBACK_DEFAULT_BPM;
  }
  return clamp(Math.round(parsed), MELODY_PLAYBACK_MIN_BPM, MELODY_PLAYBACK_MAX_BPM);
}

function getMedian(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function getValidDurationColumns(events: Pick<MelodyDefinition, 'events'>['events']) {
  return events
    .map((event) => normalizePositiveNumber(event.durationColumns))
    .filter((value): value is number => value !== null);
}

function getColumnReference(events: Pick<MelodyDefinition, 'events'>['events']) {
  return getMedian(getValidDurationColumns(events));
}

function getColumnDerivedBeats(
  event: MelodyDefinition['events'][number],
  melody?: Pick<MelodyDefinition, 'events'> | MelodyDefinition['events']
) {
  const durationColumns = normalizePositiveNumber(event.durationColumns);
  if (durationColumns === null) return null;
  const events = Array.isArray(melody) ? melody : melody?.events;
  if (!events || events.length === 0) return null;
  const columnReference = getColumnReference(events);
  if (columnReference === null || columnReference <= 0) return null;
  return clamp(durationColumns / columnReference, 0.25, 8);
}

export function getEventDurationBeats(event: MelodyDefinition['events'][number]) {
  const fromBeats = normalizePositiveNumber(event.durationBeats);
  if (fromBeats !== null) return fromBeats;
  const countSteps = normalizePositiveNumber(event.durationCountSteps);
  if (countSteps !== null) return countSteps / 2;
  return null;
}

export function getMelodyEventPlaybackDurationMs(
  event: MelodyDefinition['events'][number],
  bpm: number,
  melody?: Pick<MelodyDefinition, 'events'> | MelodyDefinition['events']
) {
  return Math.round(getMelodyEventPlaybackDurationExactMs(event, bpm, melody));
}

export function getMelodyEventPlaybackDurationExactMs(
  event: MelodyDefinition['events'][number],
  bpm: number,
  melody?: Pick<MelodyDefinition, 'events'> | MelodyDefinition['events']
) {
  const beats = getEventDurationBeats(event);
  if (beats !== null) {
    const beatMs = 60000 / clampMelodyPlaybackBpm(bpm);
    return clamp(
      beats * beatMs,
      MELODY_PLAYBACK_MIN_STEP_MS,
      MELODY_PLAYBACK_MAX_STEP_MS
    );
  }

  const derivedBeats = getColumnDerivedBeats(event, melody);
  if (derivedBeats !== null) {
    const beatMs = 60000 / clampMelodyPlaybackBpm(bpm);
    return clamp(
      derivedBeats * beatMs,
      MELODY_PLAYBACK_MIN_STEP_MS,
      MELODY_PLAYBACK_MAX_STEP_MS
    );
  }

  const durationColumns = Math.max(1, event.durationColumns ?? 0);
  const computed = durationColumns * MELODY_PLAYBACK_COLUMN_MS;
  return clamp(
    computed || MELODY_PLAYBACK_FALLBACK_STEP_MS,
    MELODY_PLAYBACK_MIN_STEP_MS,
    MELODY_PLAYBACK_MAX_STEP_MS
  );
}

export function computeTimelineDurationLayout(
  melody: Pick<MelodyDefinition, 'events'>
): TimelineDurationLayout {
  const beats = melody.events.map((event) => getEventDurationBeats(event));
  const columns = getValidDurationColumns(melody.events);
  const hasAnyBeats = beats.some((value) => value !== null);
  const hasAllBeats = beats.length > 0 && beats.every((value) => value !== null);
  const columnReference = getMedian(columns) ?? 1;

  const source: TimelineDurationSource = hasAllBeats
    ? 'beats'
    : hasAnyBeats
      ? 'mixed'
      : columns.length > 0
        ? 'columns'
        : 'none';

  const weights = melody.events.map((_, index) => {
    const beat = beats[index];
    if (beat !== null) return clamp(beat, 0.25, 8);
    const column = normalizePositiveNumber(melody.events[index]?.durationColumns);
    if (column !== null && columnReference > 0) {
      return clamp(column / columnReference, 0.25, 8);
    }
    return 1;
  });

  const cellCharWidths = weights.map((weight) => clamp(Math.round(weight * 4), 3, 28));
  const cellPixelWidths = weights.map((weight) => clamp(Math.round(weight * 44), 28, 240));

  return {
    source,
    hasDurationData: source !== 'none',
    weights,
    cellCharWidths,
    cellPixelWidths,
  };
}
