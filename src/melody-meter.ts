import type { MelodyDefinition } from './melody-library';
import { DEFAULT_METRONOME_BEATS_PER_BAR, clampMetronomeBeatsPerBar } from './metronome';

export interface MelodyMetronomeMeterProfile {
  beatsPerBar: number;
  beatUnitDenominator: number;
  secondaryAccentBeatIndices: number[];
}

function parseTimeSignatureText(value: string) {
  const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(value);
  if (!match) return null;
  const numerator = Number.parseInt(match[1] ?? '', 10);
  const denominator = Number.parseInt(match[2] ?? '', 10);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) {
    return null;
  }
  return { numerator, denominator };
}

function buildSecondaryAccentBeatIndices(numerator: number, denominator: number) {
  if (denominator !== 8 || numerator < 6 || numerator % 3 !== 0) return [];
  const accents: number[] = [];
  for (let beatIndex = 3; beatIndex < numerator; beatIndex += 3) {
    accents.push(beatIndex);
  }
  return accents;
}

function inferBeatsPerBarFromEventBars(events: MelodyDefinition['events']) {
  const beatsByBar = new Map<number, number>();
  for (const event of events) {
    if (typeof event.barIndex !== 'number' || !Number.isFinite(event.barIndex)) continue;
    if (typeof event.durationBeats !== 'number' || !Number.isFinite(event.durationBeats) || event.durationBeats <= 0) {
      continue;
    }
    const barIndex = Math.max(0, Math.round(event.barIndex));
    beatsByBar.set(barIndex, (beatsByBar.get(barIndex) ?? 0) + event.durationBeats);
  }

  if (beatsByBar.size === 0) return null;

  const barDurations = [...beatsByBar.values()].filter((value) => value > 0);
  if (barDurations.length === 0) return null;

  const average = barDurations.reduce((sum, value) => sum + value, 0) / barDurations.length;
  if (!Number.isFinite(average) || average <= 0) return null;

  return clampMetronomeBeatsPerBar(Math.round(average));
}

export function resolveMelodyMetronomeBeatsPerBar(
  melody: Pick<MelodyDefinition, 'id' | 'events'> | null | undefined
) {
  if (!melody) return DEFAULT_METRONOME_BEATS_PER_BAR;

  return inferBeatsPerBarFromEventBars(melody.events) ?? DEFAULT_METRONOME_BEATS_PER_BAR;
}

export function resolveMelodyMetronomeMeterProfile(
  melody: Pick<MelodyDefinition, 'id' | 'events' | 'sourceTimeSignature'> | null | undefined
): MelodyMetronomeMeterProfile {
  const parsedSignature =
    typeof melody?.sourceTimeSignature === 'string'
      ? parseTimeSignatureText(melody.sourceTimeSignature)
      : null;

  if (parsedSignature) {
    return {
      beatsPerBar: clampMetronomeBeatsPerBar(parsedSignature.numerator),
      beatUnitDenominator: parsedSignature.denominator,
      secondaryAccentBeatIndices: buildSecondaryAccentBeatIndices(
        parsedSignature.numerator,
        parsedSignature.denominator
      ),
    };
  }

  return {
    beatsPerBar: resolveMelodyMetronomeBeatsPerBar(melody),
    beatUnitDenominator: 4,
    secondaryAccentBeatIndices: [],
  };
}
