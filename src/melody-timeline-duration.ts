import type { MelodyDefinition } from './melody-library';

export type TimelineDurationSource = 'beats' | 'columns' | 'mixed' | 'none';

export interface TimelineDurationLayout {
  source: TimelineDurationSource;
  hasDurationData: boolean;
  weights: number[];
  cellCharWidths: number[];
  cellPixelWidths: number[];
}

function normalizePositiveNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

export function getEventDurationBeats(event: MelodyDefinition['events'][number]) {
  const fromBeats = normalizePositiveNumber(event.durationBeats);
  if (fromBeats !== null) return fromBeats;
  const countSteps = normalizePositiveNumber(event.durationCountSteps);
  if (countSteps !== null) return countSteps / 2;
  return null;
}

export function computeTimelineDurationLayout(
  melody: Pick<MelodyDefinition, 'events'>
): TimelineDurationLayout {
  const beats = melody.events.map((event) => getEventDurationBeats(event));
  const columns = melody.events.map((event) => normalizePositiveNumber(event.durationColumns));
  const hasAnyBeats = beats.some((value) => value !== null);
  const hasAllBeats = beats.length > 0 && beats.every((value) => value !== null);
  const validColumns = columns.filter((value): value is number => value !== null);
  const columnReference = getMedian(validColumns) ?? 1;

  const source: TimelineDurationSource = hasAllBeats
    ? 'beats'
    : hasAnyBeats
      ? 'mixed'
      : validColumns.length > 0
        ? 'columns'
        : 'none';

  const weights = melody.events.map((_, index) => {
    const beat = beats[index];
    if (beat !== null) return clamp(beat, 0.25, 8);
    const column = columns[index];
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
