import type { MelodyDefinition } from './melody-library';
import { getEventDurationBeats } from './melody-timeline-duration';

const DEFAULT_TIMELINE_BEATS_PER_BAR = 4;

export interface TimelineBarGrouping {
  source: 'none' | 'explicit' | 'duration';
  hasBeatTiming: boolean;
  beatsPerBar: number | null;
  totalBars: number | null;
  barStartEventIndexes: Set<number>;
}

export function buildMelodyContentSignature(melody: Pick<MelodyDefinition, 'events'>) {
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
      const noteText = `${note.note}|${note.stringName ?? '-'}|${note.fret ?? '-'}|${note.finger ?? '-'}`;
      for (let index = 0; index < noteText.length; index++) {
        hash ^= noteText.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
  }

  return (hash >>> 0).toString(16);
}

function normalizeNonNegativeInteger(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export function buildTimelineBarGrouping(melody: Pick<MelodyDefinition, 'events'>): TimelineBarGrouping {
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
