import { NOTE_TO_SEMITONE } from './constants';

const FLAT_TO_SHARP_MAP: Record<string, string> = {
  Bb: 'A#',
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  'E#': 'F',
  'B#': 'C',
};

export function toPitchClass(noteName: string | null | undefined): string | null {
  if (typeof noteName !== 'string') return null;

  const cleaned = noteName
    .trim()
    .replace(/-?\d+$/, '')
    .replace(/\u266f/g, '#')
    .replace(/\u266d/g, 'b');
  const match = /^([A-Ga-g])([#b]?)$/.exec(cleaned);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const accidental = match[2] ?? '';
  const canonical = `${letter}${accidental}`;
  const sharpName = FLAT_TO_SHARP_MAP[canonical] ?? canonical;
  return typeof NOTE_TO_SEMITONE[sharpName] === 'number' ? sharpName : null;
}
