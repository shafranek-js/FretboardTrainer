import { describe, expect, it } from 'vitest';
import { shouldRearmMicOnsetForSameNote } from './mic-note-reattack';

describe('shouldRearmMicOnsetForSameNote', () => {
  it('ignores non-performance path', () => {
    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: false,
        onsetAgeMs: 120,
        currentVolume: 0.02,
        previousVolume: 0.01,
      })
    ).toBe(false);
  });

  it('requires minimum onset age and sufficient rise', () => {
    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: true,
        onsetAgeMs: 10,
        currentVolume: 0.02,
        previousVolume: 0.01,
      })
    ).toBe(false);

    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: true,
        onsetAgeMs: 80,
        currentVolume: 0.0144,
        previousVolume: 0.0135,
      })
    ).toBe(false);
  });

  it('requires a brief decay before rearming same-note onset', () => {
    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: true,
        onsetAgeMs: 80,
        currentVolume: 0.02,
        previousVolume: 0.0188,
        peakVolume: 0.02,
      })
    ).toBe(false);
  });

  it('uses tempo-aware minimum onset age', () => {
    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: true,
        onsetAgeMs: 20,
        currentVolume: 0.022,
        previousVolume: 0.014,
        peakVolume: 0.022,
        eventDurationMs: 140,
      })
    ).toBe(false);

    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: true,
        onsetAgeMs: 26,
        currentVolume: 0.022,
        previousVolume: 0.014,
        peakVolume: 0.022,
        eventDurationMs: 140,
      })
    ).toBe(true);
  });

  it('accepts clear re-attack rise for same note', () => {
    expect(
      shouldRearmMicOnsetForSameNote({
        performanceAdaptive: true,
        onsetAgeMs: 80,
        currentVolume: 0.02,
        previousVolume: 0.013,
      })
    ).toBe(true);
  });
});
