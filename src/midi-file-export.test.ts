import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import { buildExportMidiFileName, exportMelodyToMidiBytes } from './midi-file-export';

describe('midi-file-export', () => {
  it('exports positioned melody events as a MIDI track with tempo', async () => {
    const bytes = await exportMelodyToMidiBytes(
      {
        name: 'Romanza Fragment',
        sourceTempoBpm: 96,
        sourceTrackName: 'Lead',
        events: [
          {
            durationBeats: 1,
            notes: [{ note: 'E', stringName: 'e', fret: 0 }],
          },
          {
            durationBeats: 0.5,
            notes: [
              { note: 'G', stringName: 'e', fret: 3 },
              { note: 'C', stringName: 'B', fret: 1 },
            ],
          },
        ],
      },
      instruments.guitar
    );

    const { Midi } = await import('@tonejs/midi');
    const midi = new Midi(bytes);
    expect(midi.header.tempos[0]?.bpm).toBe(96);
    expect(midi.tracks).toHaveLength(1);
    expect(midi.tracks[0]?.name).toBe('Lead');
    expect(midi.tracks[0]?.notes).toHaveLength(3);
    expect(midi.tracks[0]?.notes[0]?.ticks).toBe(0);
    expect(midi.tracks[0]?.notes[0]?.durationTicks).toBe(480);
    expect(midi.tracks[0]?.notes[1]?.ticks).toBe(480);
    expect(midi.tracks[0]?.notes[1]?.durationTicks).toBe(240);
    expect(midi.tracks[0]?.notes[2]?.ticks).toBe(480);
  });

  it('falls back to normalized column durations when beat timing is unavailable', async () => {
    const bytes = await exportMelodyToMidiBytes(
      {
        name: 'Column Melody',
        events: [
          {
            durationColumns: 2,
            notes: [{ note: 'E', stringName: 'e', fret: 0 }],
          },
          {
            durationColumns: 4,
            notes: [{ note: 'G', stringName: 'e', fret: 3 }],
          },
        ],
      },
      instruments.guitar
    );

    const { Midi } = await import('@tonejs/midi');
    const midi = new Midi(bytes);
    expect(midi.tracks[0]?.notes[0]?.durationTicks).toBe(320);
    expect(midi.tracks[0]?.notes[1]?.ticks).toBe(320);
    expect(midi.tracks[0]?.notes[1]?.durationTicks).toBe(640);
  });

  it('builds a safe file name for downloaded MIDI files', () => {
    expect(buildExportMidiFileName(' Godfather: Main/Theme ')).toBe('Godfather Main Theme.mid');
  });
});
