import { describe, expect, it } from 'vitest';
import { resolvePerformanceTransportFrame } from './performance-transport';
import type { MelodyDefinition } from './melody-library';

const melody: MelodyDefinition = {
  id: 'test',
  name: 'Test',
  instrument: 'guitar',
  source: 'custom',
  events: [
    { notes: [{ note: 'C', stringName: 'A', fret: 3 }], durationBeats: 1 },
    { notes: [{ note: 'D', stringName: 'A', fret: 5 }], durationBeats: 2 },
  ],
};

describe('performance-transport', () => {
  it('resolves the active event from continuous elapsed time', () => {
    const frame = resolvePerformanceTransportFrame({
      melody,
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 1 },
      runtimeStartedAtMs: 1000,
      nowMs: 1700,
    });

    expect(frame.activeEventIndex).toBe(1);
    expect(frame.isComplete).toBe(false);
    expect(frame.eventStartedAtMs).toBe(1500);
  });

  it('marks the transport complete after the final event duration elapses', () => {
    const frame = resolvePerformanceTransportFrame({
      melody,
      bpm: 120,
      studyRange: { startIndex: 0, endIndex: 1 },
      runtimeStartedAtMs: 1000,
      nowMs: 2600,
    });

    expect(frame.activeEventIndex).toBeNull();
    expect(frame.isComplete).toBe(true);
    expect(frame.eventStartedAtMs).toBe(2500);
  });
});
