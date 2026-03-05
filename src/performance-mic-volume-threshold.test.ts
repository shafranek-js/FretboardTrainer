import { describe, expect, it } from 'vitest';
import { resolvePerformanceMicVolumeThreshold } from './performance-mic-volume-threshold';

describe('resolvePerformanceMicVolumeThreshold', () => {
  it('relaxes base threshold in normal conditions', () => {
    const threshold = resolvePerformanceMicVolumeThreshold({
      baseThreshold: 0.03,
      sensitivityPreset: 'normal',
      autoNoiseFloorRms: 0.003,
    });

    expect(threshold).toBeCloseTo(0.0108, 4);
  });

  it('keeps higher floor in noisy-room preset', () => {
    const threshold = resolvePerformanceMicVolumeThreshold({
      baseThreshold: 0.055,
      sensitivityPreset: 'noisy_room',
      autoNoiseFloorRms: 0.012,
    });

    expect(threshold).toBeGreaterThanOrEqual(0.025);
    expect(threshold).toBeLessThanOrEqual(0.055);
  });

  it('does not go below noise guard even when base threshold is tiny', () => {
    const threshold = resolvePerformanceMicVolumeThreshold({
      baseThreshold: 0.012,
      sensitivityPreset: 'quiet_room',
      autoNoiseFloorRms: 0.007,
    });

    expect(threshold).toBeGreaterThanOrEqual(0.011);
    expect(threshold).toBeLessThanOrEqual(0.012);
  });
});
