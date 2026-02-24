import { describe, expect, it } from 'vitest';
import {
  getMicNoteHoldDurationMs,
  normalizeMicNoteHoldFilterPreset,
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
});
