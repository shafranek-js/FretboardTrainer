import { describe, expect, it } from 'vitest';
import {
  clampMetronomeBpm,
  clampMetronomeBeatsPerBar,
  clampMetronomeVolumePercent,
  computeMetronomeIntervalMs,
  DEFAULT_METRONOME_BEATS_PER_BAR,
  MAX_METRONOME_BEATS_PER_BAR,
  MAX_METRONOME_VOLUME_PERCENT,
  MAX_METRONOME_BPM,
  MIN_METRONOME_BEATS_PER_BAR,
  MIN_METRONOME_VOLUME_PERCENT,
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

  it('clamps metronome volume percent to supported range', () => {
    expect(clampMetronomeVolumePercent(-15)).toBe(MIN_METRONOME_VOLUME_PERCENT);
    expect(clampMetronomeVolumePercent(450)).toBe(MAX_METRONOME_VOLUME_PERCENT);
    expect(clampMetronomeVolumePercent(57.7)).toBe(58);
    expect(clampMetronomeVolumePercent(Number.NaN)).toBe(100);
  });

  it('clamps beats-per-bar to supported range', () => {
    expect(clampMetronomeBeatsPerBar(0)).toBe(MIN_METRONOME_BEATS_PER_BAR);
    expect(clampMetronomeBeatsPerBar(20)).toBe(MAX_METRONOME_BEATS_PER_BAR);
    expect(clampMetronomeBeatsPerBar(2.6)).toBe(3);
    expect(clampMetronomeBeatsPerBar(Number.NaN)).toBe(DEFAULT_METRONOME_BEATS_PER_BAR);
  });
});

