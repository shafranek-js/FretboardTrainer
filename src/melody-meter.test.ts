import { describe, expect, it } from 'vitest';
import {
  resolveMelodyMetronomeBeatsPerBar,
  resolveMelodyMetronomeMeterProfile,
} from './melody-meter';

describe('melody-meter', () => {
  it('falls back to default beats-per-bar when meter cannot be inferred', () => {
    expect(
      resolveMelodyMetronomeBeatsPerBar({
        id: 'custom:unknown-meter',
        events: [],
      })
    ).toBe(4);
  });

  it('infers beats per bar from event bar indexes and beat durations', () => {
    expect(
      resolveMelodyMetronomeBeatsPerBar({
        id: 'custom:test',
        events: [
          { barIndex: 0, durationBeats: 1, notes: [] },
          { barIndex: 0, durationBeats: 2, notes: [] },
          { barIndex: 1, durationBeats: 1.5, notes: [] },
          { barIndex: 1, durationBeats: 1.5, notes: [] },
        ],
      })
    ).toBe(3);
  });

  it('falls back to default when meter cannot be inferred', () => {
    expect(
      resolveMelodyMetronomeBeatsPerBar({
        id: 'custom:no-bars',
        events: [{ durationBeats: 1, notes: [] }],
      })
    ).toBe(4);
  });

  it('builds compound accent profile from 6/8 source signature', () => {
    const profile = resolveMelodyMetronomeMeterProfile({
      id: 'custom:six-eight',
      sourceTimeSignature: '6/8',
      events: [],
    });
    expect(profile.beatsPerBar).toBe(6);
    expect(profile.beatUnitDenominator).toBe(8);
    expect(profile.secondaryAccentBeatIndices).toEqual([3]);
  });

  it('uses explicit source signature when available', () => {
    const profile = resolveMelodyMetronomeMeterProfile({
      id: 'custom:three-four',
      sourceTimeSignature: '3/4',
      events: [],
    });
    expect(profile.beatsPerBar).toBe(3);
    expect(profile.beatUnitDenominator).toBe(4);
    expect(profile.secondaryAccentBeatIndices).toEqual([]);
  });
});
