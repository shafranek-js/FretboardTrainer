import { describe, expect, it } from 'vitest';
import {
  clampMetronomeBpm,
  computeMetronomeIntervalMs,
  MAX_METRONOME_BPM,
  MIN_METRONOME_BPM,
} from './metronome';

describe('metronome helpers', () => {
  it('clamps bpm to supported range', () => {
    expect(clampMetronomeBpm(20)).toBe(MIN_METRONOME_BPM);
    expect(clampMetronomeBpm(400)).toBe(MAX_METRONOME_BPM);
    expect(clampMetronomeBpm(97.6)).toBe(98);
  });

  it('uses fallback bpm for invalid numbers', () => {
    expect(clampMetronomeBpm(Number.NaN)).toBe(80);
  });

  it('computes interval in milliseconds from bpm', () => {
    expect(computeMetronomeIntervalMs(60)).toBe(1000);
    expect(computeMetronomeIntervalMs(120)).toBe(500);
  });
});

