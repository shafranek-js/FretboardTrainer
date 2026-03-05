import { describe, expect, it } from 'vitest';
import {
  getMicNoteHoldDurationMs,
  normalizeMicNoteHoldFilterPreset,
  resolveMicNoteHoldRequiredDurationMs,
  shouldAcceptMicNoteByHoldDuration,
} from './mic-note-hold-filter';

describe('mic-note-hold-filter', () => {
  it('normalizes presets with 80ms default', () => {
    expect(normalizeMicNoteHoldFilterPreset('off')).toBe('off');
    expect(normalizeMicNoteHoldFilterPreset('40ms')).toBe('40ms');
    expect(normalizeMicNoteHoldFilterPreset('80ms')).toBe('80ms');
    expect(normalizeMicNoteHoldFilterPreset('120ms')).toBe('120ms');
    expect(normalizeMicNoteHoldFilterPreset('bad')).toBe('80ms');
  });

  it('maps presets to increasing hold durations', () => {
    expect(getMicNoteHoldDurationMs('off')).toBe(0);
    expect(getMicNoteHoldDurationMs('40ms')).toBe(40);
    expect(getMicNoteHoldDurationMs('80ms')).toBe(80);
    expect(getMicNoteHoldDurationMs('120ms')).toBe(120);
  });

  it('accepts only after minimum hold duration is reached', () => {
    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: 'off',
        noteFirstDetectedAtMs: null,
        nowMs: 1000,
      })
    ).toBe(true);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1050,
      })
    ).toBe(false);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1080,
      })
    ).toBe(true);
  });

  it('uses softer hold timing in performance-adaptive mode', () => {
    expect(
      resolveMicNoteHoldRequiredDurationMs({
        preset: '80ms',
        performanceAdaptive: true,
      })
    ).toBe(28);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1027,
        performanceAdaptive: true,
      })
    ).toBe(false);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1028,
        performanceAdaptive: true,
      })
    ).toBe(true);
  });

  it('caps hold requirement by short event duration in performance mode', () => {
    expect(
      resolveMicNoteHoldRequiredDurationMs({
        preset: '80ms',
        performanceAdaptive: true,
        eventDurationMs: 24,
      })
    ).toBe(4);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1003,
        performanceAdaptive: true,
        eventDurationMs: 24,
      })
    ).toBe(false);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1004,
        performanceAdaptive: true,
        eventDurationMs: 24,
      })
    ).toBe(true);
  });

  it('uses a lower hold cap for fast medium-length events', () => {
    expect(
      resolveMicNoteHoldRequiredDurationMs({
        preset: '80ms',
        performanceAdaptive: true,
        eventDurationMs: 300,
      })
    ).toBe(12);
  });

  it('relaxes hold requirement further when calibration marks short-hold misses as dominant', () => {
    expect(
      resolveMicNoteHoldRequiredDurationMs({
        preset: '80ms',
        performanceAdaptive: true,
        performanceCalibrationLevel: 'mild',
      })
    ).toBe(23);

    expect(
      resolveMicNoteHoldRequiredDurationMs({
        preset: '80ms',
        performanceAdaptive: true,
        performanceCalibrationLevel: 'strong',
      })
    ).toBe(15);

    expect(
      shouldAcceptMicNoteByHoldDuration({
        preset: '80ms',
        noteFirstDetectedAtMs: 1000,
        nowMs: 1015,
        performanceAdaptive: true,
        performanceCalibrationLevel: 'strong',
      })
    ).toBe(true);

    expect(
      resolveMicNoteHoldRequiredDurationMs({
        preset: '80ms',
        performanceAdaptive: true,
        eventDurationMs: 24,
        performanceCalibrationLevel: 'strong',
      })
    ).toBe(3);
  });
});
