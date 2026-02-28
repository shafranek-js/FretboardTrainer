import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import type { MelodyDefinition } from './melody-library';
import {
  formatMelodyTransposeSemitones,
  getMelodyWithTranspose,
  normalizeMelodyTransposeSemitones,
  transposeMelodyEvents,
  transposePitchClass,
} from './melody-transposition';

function stripOctave(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

function toMidi(noteWithOctave: string) {
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

describe('melody-transposition', () => {
  it('normalizes and clamps transpose semitones', () => {
    expect(normalizeMelodyTransposeSemitones(3.4)).toBe(3);
    expect(normalizeMelodyTransposeSemitones(-99)).toBe(-12);
    expect(normalizeMelodyTransposeSemitones(99)).toBe(12);
    expect(normalizeMelodyTransposeSemitones('7')).toBe(7);
    expect(normalizeMelodyTransposeSemitones('bad')).toBe(0);
  });

  it('formats transpose labels', () => {
    expect(formatMelodyTransposeSemitones(0)).toBe('0 st');
    expect(formatMelodyTransposeSemitones(2)).toBe('+2 st');
    expect(formatMelodyTransposeSemitones(-3)).toBe('-3 st');
  });

  it('transposes pitch classes with flats and sharps', () => {
    expect(transposePitchClass('C', 2)).toBe('D');
    expect(transposePitchClass('Bb', 2)).toBe('C');
    expect(transposePitchClass('F#', -1)).toBe('F');
  });

  it('re-resolves playable positions after transposition', () => {
    const instrument = instruments.guitar;
    const sourceEvents = [
      {
        barIndex: 0,
        column: 0,
        durationColumns: 4,
        durationBeats: 1,
        notes: [{ note: 'C', stringName: 'A', fret: 3 }],
      },
      {
        barIndex: 0,
        column: 4,
        durationColumns: 4,
        durationBeats: 1,
        notes: [{ note: 'E', stringName: 'D', fret: 2 }],
      },
    ];

    const transposed = transposeMelodyEvents(sourceEvents, 2, instrument);
    expect(transposed).toHaveLength(2);
    expect(transposed[0]?.durationBeats).toBe(1);
    expect(transposed[1]?.durationColumns).toBe(4);
    expect(transposed[0]?.notes[0]?.note).toBe('D');
    expect(transposed[1]?.notes[0]?.note).toBe('F#');

    transposed.flatMap((event) => event.notes).forEach((note) => {
      expect(note.stringName).not.toBeNull();
      expect(typeof note.fret).toBe('number');

      const noteWithOctave = instrument.getNoteWithOctave(note.stringName!, note.fret!);
      expect(noteWithOctave).not.toBeNull();
      expect(stripOctave(noteWithOctave!)).toBe(note.note);
    });
  });

  it('returns cached transposed melody instances for same key', () => {
    const instrument = instruments.guitar;
    const melody: MelodyDefinition = {
      id: 'test:melody',
      name: 'Test Melody',
      source: 'custom',
      instrumentName: 'guitar',
      events: [{ notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
    };

    const first = getMelodyWithTranspose(melody, 2, instrument);
    const second = getMelodyWithTranspose(melody, 2, instrument);
    const passthrough = getMelodyWithTranspose(melody, 0, instrument);

    expect(first).toBe(second);
    expect(first.events[0]?.notes[0]?.note).toBe('D');
    expect(passthrough).toBe(melody);
  });

  it('keeps exact semitone offset per known-position note (no random octave jumps)', () => {
    const instrument = instruments.guitar;
    const sourceEvents = [
      { notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
      { notes: [{ note: 'E', stringName: 'D', fret: 2 }] },
      { notes: [{ note: 'G', stringName: 'D', fret: 5 }] },
      { notes: [{ note: 'C', stringName: 'B', fret: 1 }] },
    ];

    const transposed = transposeMelodyEvents(sourceEvents, 5, instrument);
    expect(transposed).toHaveLength(sourceEvents.length);

    sourceEvents.forEach((event, index) => {
      const source = event.notes[0]!;
      const target = transposed[index]?.notes[0];
      expect(target).toBeDefined();
      expect(target?.stringName).not.toBeNull();
      expect(typeof target?.fret).toBe('number');

      const sourceNoteWithOctave = instrument.getNoteWithOctave(source.stringName!, source.fret!);
      const targetNoteWithOctave = instrument.getNoteWithOctave(target!.stringName!, target!.fret!);
      expect(sourceNoteWithOctave).not.toBeNull();
      expect(targetNoteWithOctave).not.toBeNull();

      const sourceMidi = toMidi(sourceNoteWithOctave!);
      const targetMidi = toMidi(targetNoteWithOctave!);
      expect(sourceMidi).not.toBeNull();
      expect(targetMidi).not.toBeNull();
      expect(targetMidi).toBe(sourceMidi! + 5);
    });
  });
});
