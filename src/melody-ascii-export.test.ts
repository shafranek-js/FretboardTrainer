import { describe, expect, it } from 'vitest';
import { exportMelodyToAsciiTab } from './melody-ascii-export';
import { instruments } from './instruments';
import type { MelodyDefinition } from './melody-library';

describe('melody-ascii-export', () => {
  it('exports monophonic beat-timed melodies to ascii tab with a count line', () => {
    const melody: MelodyDefinition = {
      id: 'test:ascii',
      name: 'Test',
      source: 'custom',
      instrumentName: 'guitar',
      events: [
        { durationBeats: 1, notes: [{ note: 'E', stringName: 'E', fret: 0 }] },
        { durationBeats: 1, notes: [{ note: 'G', stringName: 'E', fret: 3 }] },
        { durationBeats: 2, notes: [{ note: 'A', stringName: 'E', fret: 5 }] },
      ],
    };

    const ascii = exportMelodyToAsciiTab(melody, instruments.guitar);

    expect(ascii).toContain('E|0-------3-------5---------------');
    expect(ascii).toContain('count 1   &   2   &   3   &   4   &   ');
  });

  it('exports polyphonic notes on separate string rows', () => {
    const melody: MelodyDefinition = {
      id: 'test:poly',
      name: 'Poly',
      source: 'custom',
      instrumentName: 'guitar',
      events: [
        {
          durationBeats: 1,
          notes: [
            { note: 'C', stringName: 'A', fret: 3 },
            { note: 'E', stringName: 'D', fret: 2 },
          ],
        },
      ],
    };

    const ascii = exportMelodyToAsciiTab(melody, instruments.guitar);

    expect(ascii).toContain('A|3-------');
    expect(ascii).toContain('D|2-------');
  });
});
