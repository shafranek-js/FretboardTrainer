import type { IInstrument } from './instruments/instrument';
import { ALL_NOTES } from './constants';

interface ResolvePromptTargetInput {
  targetNote: string;
  preferredString: string | null;
  enabledStrings: Set<string>;
  instrument: Pick<IInstrument, 'FRETBOARD' | 'STRING_ORDER'>;
}

export interface ResolvedPromptTarget {
  stringName: string;
  fret: number;
}

const A4_INDEX = ALL_NOTES.indexOf('A') + 4 * 12;

function parseOpenStringTuning(tuning: string) {
  const match = /^([A-G]#?)(-?\d+)$/.exec(tuning);
  if (!match) return null;

  return {
    note: match[1],
    octave: Number.parseInt(match[2], 10),
  };
}

export function resolvePromptTargetPosition({
  targetNote,
  preferredString,
  enabledStrings,
  instrument,
}: ResolvePromptTargetInput): ResolvedPromptTarget | null {
  const fretboard = instrument.FRETBOARD;
  const findFret = (stringName: string) => fretboard[stringName]?.[targetNote];

  if (preferredString) {
    const preferredFret = findFret(preferredString);
    if (typeof preferredFret === 'number') {
      return { stringName: preferredString, fret: preferredFret };
    }
  }

  for (const stringName of instrument.STRING_ORDER) {
    if (!enabledStrings.has(stringName)) continue;
    const fret = findFret(stringName);
    if (typeof fret === 'number') {
      return { stringName, fret };
    }
  }

  return null;
}

export function calculateFrettedFrequencyFromTuning(
  openStringTuning: string,
  fret: number,
  calibratedA4: number
): number | null {
  const parsed = parseOpenStringTuning(openStringTuning);
  if (!parsed) return null;

  const noteIndex = ALL_NOTES.indexOf(parsed.note);
  if (noteIndex === -1 || !Number.isFinite(calibratedA4) || calibratedA4 <= 0) return null;

  const semitonesFromC0 = noteIndex + parsed.octave * 12;
  const semitonesFromA4 = semitonesFromC0 - A4_INDEX;
  const openStringFrequency = calibratedA4 * Math.pow(2, semitonesFromA4 / 12);

  return openStringFrequency * Math.pow(2, fret / 12);
}
