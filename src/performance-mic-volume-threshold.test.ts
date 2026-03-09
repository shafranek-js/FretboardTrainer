import { describe, expect, it } from 'vitest';
import {
  resolvePerformanceMicVolumeThreshold,
  resolveStudyMelodyMicVolumeThreshold,
} from './performance-mic-volume-threshold';

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

it('relaxes Study Melody threshold below performance threshold while preserving a noise guard', () => {
  const performanceThreshold = resolvePerformanceMicVolumeThreshold({
    baseThreshold: 0.03,
    sensitivityPreset: 'normal',
    autoNoiseFloorRms: 0.003,
  });
  const studyThreshold = resolveStudyMelodyMicVolumeThreshold({
    baseThreshold: 0.03,
    sensitivityPreset: 'normal',
    autoNoiseFloorRms: 0.003,
  });

  expect(studyThreshold).toBeLessThan(performanceThreshold);
  expect(studyThreshold).toBeGreaterThanOrEqual(0.0042);
});

it('keeps Study Melody threshold above the softer study noise guard in noisy rooms', () => {
  const threshold = resolveStudyMelodyMicVolumeThreshold({
    baseThreshold: 0.055,
    sensitivityPreset: 'noisy_room',
    autoNoiseFloorRms: 0.012,
  });

  expect(threshold).toBeGreaterThanOrEqual(0.0162);
  expect(threshold).toBeLessThanOrEqual(0.055);
});


