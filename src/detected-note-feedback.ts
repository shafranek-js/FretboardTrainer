import { resolvePromptTargetPosition } from './prompt-audio';
import type { Prompt } from './types';

export function stripScientificOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

export function resolveDetectedScientificPosition(
  detectedScientificNote: string,
  enabledStrings: Set<string>,
  instrument: {
    STRING_ORDER: string[];
    getNoteWithOctave(stringName: string, fret: number): string | null;
  },
  maxFret = 24
) {
  for (const stringName of instrument.STRING_ORDER) {
    if (!enabledStrings.has(stringName)) continue;
    for (let fret = 0; fret <= maxFret; fret++) {
      const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
      if (noteWithOctave === detectedScientificNote) {
        return { stringName, fret };
      }
    }
  }
  return null;
}

export function resolveWrongDetectedHighlight(args: {
  detectedNote: string;
  detectedFrequency?: number | null;
  enabledStrings: Set<string>;
  instrument: {
    STRING_ORDER: string[];
    getNoteWithOctave(stringName: string, fret: number): string | null;
    FRETBOARD: Record<string, Record<string, number>>;
  };
  freqToScientificNoteName(frequency: number): string | null;
}) {
  const detectedScientific =
    typeof args.detectedFrequency === 'number' && args.detectedFrequency > 0
      ? args.freqToScientificNoteName(args.detectedFrequency)
      : null;
  const exactResolved = detectedScientific
    ? resolveDetectedScientificPosition(detectedScientific, args.enabledStrings, args.instrument)
    : null;
  const resolved = resolvePromptTargetPosition({
    targetNote: args.detectedNote,
    preferredString: null,
    enabledStrings: args.enabledStrings,
    instrument: args.instrument,
  });

  return {
    wrongDetectedNote: args.detectedNote,
    wrongDetectedString: exactResolved?.stringName ?? resolved?.stringName ?? null,
    wrongDetectedFret: exactResolved?.fret ?? resolved?.fret ?? null,
  };
}

export function detectMonophonicOctaveMismatch(args: {
  prompt: Prompt | null;
  targetFrequency: number | null;
  detectedNote: string;
  detectedFrequency?: number | null;
  freqToScientificNoteName(frequency: number): string | null;
}) {
  const prompt = args.prompt;
  if (!prompt?.targetNote || !prompt.targetString) return null;
  if (
    typeof args.detectedFrequency !== 'number' ||
    !Number.isFinite(args.detectedFrequency) ||
    args.detectedFrequency <= 0
  ) {
    return null;
  }
  if (
    !Number.isFinite(args.targetFrequency) ||
    !args.targetFrequency ||
    args.targetFrequency <= 0
  ) {
    return null;
  }

  const detectedScientific = args.freqToScientificNoteName(args.detectedFrequency);
  const targetScientific = args.freqToScientificNoteName(args.targetFrequency);
  if (!detectedScientific || !targetScientific) return null;
  if (stripScientificOctave(detectedScientific) !== args.detectedNote) return null;
  if (stripScientificOctave(targetScientific) !== prompt.targetNote) return null;
  if (detectedScientific === targetScientific) return null;

  return { detectedScientific, targetScientific };
}
