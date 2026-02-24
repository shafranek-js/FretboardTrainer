import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import { listMelodiesForInstrument } from './melody-library';

function expectBuiltinMelodiesToBeComfortable(
  melodies: ReturnType<typeof listMelodiesForInstrument>,
  limits: { maxFret: number; maxConsecutiveFretJump: number; maxFretSpan: number }
) {
  melodies.forEach((melody) => {
    const frets = melody.events
      .flatMap((event) => event.notes)
      .map((step) => step.fret)
      .filter((fret): fret is number => fret !== null);
    expect(frets.length).toBeGreaterThan(0);
    expect(Math.max(...frets)).toBeLessThanOrEqual(limits.maxFret);
    expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(limits.maxFretSpan);

    for (let i = 1; i < frets.length; i++) {
      expect(Math.abs(frets[i] - frets[i - 1])).toBeLessThanOrEqual(limits.maxConsecutiveFretJump);
    }
  });
}

describe('melody-library builtins', () => {
  it('returns position-based built-in melodies for guitar', () => {
    const melodies = listMelodiesForInstrument(instruments.guitar).filter((m) => m.source === 'builtin');

    expect(melodies.length).toBeGreaterThanOrEqual(2);
    melodies.forEach((melody) => {
      expect(melody.events.length).toBeGreaterThan(0);
      melody.events.flatMap((event) => event.notes).forEach((step) => {
        expect(step.stringName).not.toBeNull();
        expect(step.fret).not.toBeNull();
      });
    });

    expectBuiltinMelodiesToBeComfortable(melodies, {
      maxFret: 10,
      maxConsecutiveFretJump: 4,
      maxFretSpan: 5,
    });
  });

  it('returns position-based built-in melodies for ukulele', () => {
    const melodies = listMelodiesForInstrument(instruments.ukulele).filter((m) => m.source === 'builtin');

    expect(melodies.length).toBeGreaterThanOrEqual(2);
    melodies.forEach((melody) => {
      expect(melody.events.length).toBeGreaterThan(0);
      melody.events.flatMap((event) => event.notes).forEach((step) => {
        expect(step.stringName).not.toBeNull();
        expect(step.fret).not.toBeNull();
      });
    });

    expectBuiltinMelodiesToBeComfortable(melodies, {
      maxFret: 3,
      maxConsecutiveFretJump: 3,
      maxFretSpan: 3,
    });
  });
});
