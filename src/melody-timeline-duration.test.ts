import { describe, expect, it } from 'vitest';
import {
  clampMelodyPlaybackBpm,
  computeTimelineDurationLayout,
  getMelodyEventPlaybackDurationMs,
  getEventDurationBeats,
} from './melody-timeline-duration';
import type { MelodyDefinition } from './melody-library';

function buildMelody(events: MelodyDefinition['events']): MelodyDefinition {
  return {
    id: 'test',
    name: 'Test',
    source: 'custom',
    instrumentName: 'guitar',
    events,
  };
}

describe('melody-timeline-duration', () => {
  it('derives beat durations from durationBeats and count steps', () => {
    expect(getEventDurationBeats({ notes: [], durationBeats: 2 })).toBe(2);
    expect(getEventDurationBeats({ notes: [], durationCountSteps: 3 })).toBe(1.5);
    expect(getEventDurationBeats({ notes: [] })).toBeNull();
  });

  it('scales widths from beat durations when available', () => {
    const layout = computeTimelineDurationLayout(
      buildMelody([
        { notes: [], durationBeats: 0.5 },
        { notes: [], durationBeats: 1 },
        { notes: [], durationBeats: 2.5 },
      ])
    );

    expect(layout.source).toBe('beats');
    expect(layout.weights).toEqual([0.5, 1, 2.5]);
    expect(layout.cellPixelWidths[2]).toBeGreaterThan(layout.cellPixelWidths[1]);
    expect(layout.cellPixelWidths[1]).toBeGreaterThan(layout.cellPixelWidths[0]);
  });

  it('uses column-based relative scaling when beat timing is absent', () => {
    const layout = computeTimelineDurationLayout(
      buildMelody([
        { notes: [], durationColumns: 4 },
        { notes: [], durationColumns: 8 },
        { notes: [], durationColumns: 16 },
      ])
    );

    expect(layout.source).toBe('columns');
    expect(layout.weights[0]).toBeLessThan(layout.weights[1]);
    expect(layout.weights[1]).toBeLessThan(layout.weights[2]);
  });

  it('handles mixed timing metadata (beats + columns)', () => {
    const layout = computeTimelineDurationLayout(
      buildMelody([
        { notes: [], durationBeats: 1 },
        { notes: [], durationColumns: 8 },
      ])
    );

    expect(layout.source).toBe('mixed');
    expect(layout.weights).toHaveLength(2);
    expect(layout.hasDurationData).toBe(true);
  });

  it('clamps playback bpm to a safe range', () => {
    expect(clampMelodyPlaybackBpm(-10)).toBe(40);
    expect(clampMelodyPlaybackBpm(999)).toBe(220);
    expect(clampMelodyPlaybackBpm(NaN)).toBe(90);
  });

  it('computes playback duration from beats or columns', () => {
    expect(getMelodyEventPlaybackDurationMs({ notes: [], durationBeats: 1 }, 120)).toBe(500);
    expect(getMelodyEventPlaybackDurationMs({ notes: [], durationColumns: 8 }, 120)).toBe(760);
  });
});
