import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import { convertParsedMidiToImportedMelody, inspectMidiFileForImport } from './midi-file-import';

describe('midi-file-import', () => {
  it('converts a parsed MIDI-like track into melody events with beat timing', () => {
    const imported = convertParsedMidiToImportedMelody(
      {
        header: {
          ppq: 480,
          tempos: [{ bpm: 96 }],
          name: 'Test MIDI',
        },
        tracks: [
          {
            name: 'Piano',
            channel: 0,
            instrument: { percussion: false, name: 'acoustic grand piano' },
            notes: [
              { midi: 64, ticks: 0, durationTicks: 480 },
              { midi: 67, ticks: 480, durationTicks: 480 },
              { midi: 71, ticks: 480, durationTicks: 480 },
              { midi: 69, ticks: 1440, durationTicks: 240 },
            ],
          },
        ],
      },
      instruments.guitar,
      'test.mid'
    );

    expect(imported.metadata.sourceFormat).toBe('midi');
    expect(imported.metadata.tempoBpm).toBe(96);
    expect(imported.events).toHaveLength(3);
    expect(imported.events[0]?.durationBeats).toBe(1);
    expect(imported.events[1]?.durationBeats).toBe(2);
    expect(imported.events[1]?.notes.length).toBe(2);
    expect(imported.events[0]?.notes[0]?.stringName).not.toBeNull();
    expect(imported.events[0]?.notes[0]?.fret).not.toBeNull();
  });

  it('auto-selects a non-percussion track when multiple tracks exist', () => {
    const imported = convertParsedMidiToImportedMelody(
      {
        header: { ppq: 480 },
        tracks: [
          {
            name: 'Drums',
            channel: 9,
            instrument: { percussion: true, name: 'drums' },
            notes: [{ midi: 36, ticks: 0, durationTicks: 120 }],
          },
          {
            name: 'Lead',
            channel: 0,
            instrument: { percussion: false, name: 'lead' },
            notes: [{ midi: 60, ticks: 0, durationTicks: 480 }],
          },
        ],
      },
      instruments.guitar,
      'multi.mid'
    );

    expect(imported.metadata.trackName).toBe('Lead');
    expect(imported.warnings.length).toBeGreaterThan(0);
  });

  it('exposes preview metadata for track range and estimated bars', () => {
    const inspected = inspectMidiFileForImport(
      {
        header: {
          ppq: 480,
          tempos: [{ bpm: 120 }, { bpm: 140 }],
          timeSignatures: [{ ticks: 0, timeSignature: [3, 4] }],
          keySignatures: [{ key: 'D', scale: 'major' }],
          name: 'Song',
        },
        tracks: [
          {
            name: 'Lead',
            channel: 0,
            instrument: { percussion: false, name: 'lead' },
            notes: [
              { midi: 60, ticks: 0, durationTicks: 480 },
              { midi: 72, ticks: 2400, durationTicks: 480 },
            ],
          },
        ],
      },
      'song.mid'
    );

    expect(inspected.timeSignatureText).toBe('3/4');
    expect(inspected.tempoChangesCount).toBe(2);
    expect(inspected.keySignatureText).toBe('D major');
    expect(inspected.trackOptions[0]?.noteRangeText).toBe('C4 - C5');
    expect(inspected.trackOptions[0]?.estimatedBars).toBe(2);
  });

  it('quantizes imported MIDI timings when requested', () => {
    const imported = convertParsedMidiToImportedMelody(
      {
        header: {
          ppq: 480,
          tempos: [{ bpm: 120 }],
        },
        tracks: [
          {
            name: 'Loose Lead',
            channel: 0,
            instrument: { percussion: false, name: 'lead' },
            notes: [
              { midi: 60, ticks: 18, durationTicks: 130 },
              { midi: 62, ticks: 248, durationTicks: 110 },
              { midi: 64, ticks: 494, durationTicks: 120 },
            ],
          },
        ],
      },
      instruments.guitar,
      'loose.mid',
      { quantize: '1/8' }
    );

    expect(imported.events).toHaveLength(3);
    expect(imported.events[0]?.durationBeats).toBe(0.5);
    expect(imported.events[1]?.durationBeats).toBe(0.5);
    expect(imported.events[2]?.durationBeats).toBe(0.5);
  });

  it('skips unresolved out-of-range MIDI notes and reports a warning', () => {
    const imported = convertParsedMidiToImportedMelody(
      {
        header: { ppq: 480 },
        tracks: [
          {
            name: 'High Lead',
            channel: 0,
            instrument: { percussion: false, name: 'lead' },
            notes: [
              { midi: 120, ticks: 0, durationTicks: 480 }, // unreachable with default import fret cap
              { midi: 64, ticks: 480, durationTicks: 480 },
            ],
          },
        ],
      },
      instruments.guitar,
      'high.mid'
    );

    expect(imported.events).toHaveLength(1);
    expect(imported.events[0]?.notes).toEqual([{ note: 'E', stringName: expect.any(String), fret: expect.any(Number) }]);
    expect(imported.warnings.some((warning) => /Skipped .*outside the playable import range/i.test(warning))).toBe(
      true
    );
    expect(imported.warnings.some((warning) => /Skipped .*event/i.test(warning))).toBe(true);
    imported.events.flatMap((event) => event.notes).forEach((note) => {
      expect(note.stringName).not.toBeNull();
      expect(note.fret).not.toBeNull();
    });
  });

  it('preserves duplicated pitch classes in one MIDI event and chooses playable positions', () => {
    const imported = convertParsedMidiToImportedMelody(
      {
        header: { ppq: 480 },
        tracks: [
          {
            name: 'Piano Chords',
            channel: 0,
            instrument: { percussion: false, name: 'piano' },
            notes: [
              { midi: 52, ticks: 0, durationTicks: 480 }, // E3
              { midi: 64, ticks: 0, durationTicks: 480 }, // E4 (duplicate pitch class)
              { midi: 67, ticks: 0, durationTicks: 480 }, // G4
              { midi: 71, ticks: 0, durationTicks: 480 }, // B4
            ],
          },
        ],
      },
      instruments.guitar,
      'duplicate-pitch-class.mid'
    );

    expect(imported.events).toHaveLength(1);
    const event = imported.events[0];
    expect(event?.notes.length).toBe(4);
    const pitchClasses = event?.notes.map((note) => note.note) ?? [];
    expect(pitchClasses.filter((note) => note === 'E')).toHaveLength(2);
    expect(imported.warnings.some((warning) => /duplicated pitch-class note/i.test(warning))).toBe(false);

    const eNotes = event?.notes.filter((note) => note.note === 'E') ?? [];
    expect(new Set(eNotes.map((note) => note.stringName)).size).toBe(eNotes.length);
    const eFrets = eNotes.map((note) => note.fret ?? 99);
    expect(Math.max(...eFrets) - Math.min(...eFrets)).toBeLessThanOrEqual(5);
  });

  it('uses global DP pathing to avoid large position jumps when possible', () => {
    const imported = convertParsedMidiToImportedMelody(
      {
        header: { ppq: 480 },
        tracks: [
          {
            name: 'Lead',
            channel: 0,
            instrument: { percussion: false, name: 'lead' },
            notes: [
              { midi: 64, ticks: 0, durationTicks: 480 }, // E4 (many positions)
              { midi: 79, ticks: 480, durationTicks: 480 }, // G5 (high neck)
              { midi: 76, ticks: 960, durationTicks: 480 }, // E5 (high neck)
            ],
          },
        ],
      },
      instruments.guitar,
      'dp-smoothing.mid'
    );

    expect(imported.events).toHaveLength(3);
    const frets = imported.events.map((event) => event.notes[0]?.fret ?? null);
    expect(frets.every((fret) => typeof fret === 'number')).toBe(true);
    // A purely local choice prefers open E first, but the global DP should move the whole phrase higher.
    expect((frets[0] as number) >= 9).toBe(true);
  });
});
