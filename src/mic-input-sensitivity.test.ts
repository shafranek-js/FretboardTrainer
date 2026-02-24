import { describe, expect, it } from 'vitest';
import {
  deriveAutoVolumeThreshold,
  estimateNoiseFloorRms,
  normalizeMicSensitivityPreset,
  resolveMicVolumeThreshold,
} from './mic-input-sensitivity';

describe('mic-input-sensitivity', () => {
  it('normalizes preset values with fallback to normal', () => {
    expect(normalizeMicSensitivityPreset('quiet_room')).toBe('quiet_room');
    expect(normalizeMicSensitivityPreset('normal')).toBe('normal');
    expect(normalizeMicSensitivityPreset('noisy_room')).toBe('noisy_room');
    expect(normalizeMicSensitivityPreset('auto')).toBe('auto');
    expect(normalizeMicSensitivityPreset('weird')).toBe('normal');
  });

  it('estimates noise floor from upper percentile of RMS samples', () => {
    const noiseFloor = estimateNoiseFloorRms([0.002, 0.003, 0.004, 0.006, 0.012, 0.015]);
    expect(noiseFloor).not.toBeNull();
    expect(noiseFloor!).toBeGreaterThanOrEqual(0.012);
  });

  it('derives auto threshold above measured noise floor and clamps to sane range', () => {
    expect(deriveAutoVolumeThreshold(0)).toBeGreaterThan(0.01);
    expect(deriveAutoVolumeThreshold(0.01)).toBeGreaterThan(0.01);
    expect(deriveAutoVolumeThreshold(0.5)).toBeLessThanOrEqual(0.12);
  });

  it('resolves preset and auto thresholds', () => {
    expect(resolveMicVolumeThreshold('normal', null)).toBe(0.03);
    expect(resolveMicVolumeThreshold('quiet_room', null)).toBeLessThan(
      resolveMicVolumeThreshold('normal', null)
    );
    expect(resolveMicVolumeThreshold('noisy_room', null)).toBeGreaterThan(
      resolveMicVolumeThreshold('normal', null)
    );
    expect(resolveMicVolumeThreshold('auto', 0.01)).toBeGreaterThan(0.01);
  });
});
