import { describe, expect, it, vi } from 'vitest';
import {
  formatMicPolyphonicBenchmarkSummary,
  runMicPolyphonicBenchmark,
} from './mic-polyphonic-benchmark';

describe('mic-polyphonic-benchmark', () => {
  it('aggregates benchmark frames and summary counts', () => {
    let tick = 0;
    const summary = runMicPolyphonicBenchmark({
      provider: 'spectrum',
      detectMicPolyphonicFrame: vi.fn(({ stableChordCounter }) => ({
        detectedNotesText: 'C,E,G',
        nextStableChordCounter: stableChordCounter + 1,
        isStableMatch: stableChordCounter >= 2,
        isStableMismatch: false,
      })),
      now: () => ++tick,
    });

    expect(summary.provider).toBe('spectrum');
    expect(summary.frames).toBe(270);
    expect(summary.avgLatencyMs).toBeGreaterThanOrEqual(1);
    expect(summary.stableMatchFrames).toBeGreaterThan(0);
    expect(summary.stableMismatchFrames).toBe(0);
  });

  it('formats a compact benchmark summary line', () => {
    expect(
      formatMicPolyphonicBenchmarkSummary({
        provider: 'essentia_experimental',
        frames: 270,
        avgLatencyMs: 2.45,
        maxLatencyMs: 8.1,
        fallbackFrames: 90,
        warningFrames: 90,
        stableMatchFrames: 80,
        stableMismatchFrames: 70,
        pendingFrames: 120,
      })
    ).toContain('Poly benchmark (Essentia Experimental): 270 frames');
  });
});
