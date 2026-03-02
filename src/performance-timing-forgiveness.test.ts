import { describe, expect, it } from 'vitest';
import {
  normalizePerformanceTimingLeniencyPreset,
  resolvePerformanceTimingForgivenessWindowMs,
  shouldForgivePerformanceTimingBoundaryAttempt,
} from './performance-timing-forgiveness';
import type { Prompt } from './types';

function createPrompt(durationMs: number): Prompt {
  return {
    displayText: 'Performance',
    targetNote: 'C',
    targetString: 'A',
    targetChordNotes: [],
    targetChordFingering: [],
    targetMelodyEventNotes: [{ note: 'C', string: 'A', fret: 3 }],
    melodyEventDurationMs: durationMs,
    baseChordName: null,
  };
}

describe('performance-timing-forgiveness', () => {
  it('normalizes preset values', () => {
    expect(normalizePerformanceTimingLeniencyPreset('strict')).toBe('strict');
    expect(normalizePerformanceTimingLeniencyPreset('forgiving')).toBe('forgiving');
    expect(normalizePerformanceTimingLeniencyPreset('normal')).toBe('normal');
    expect(normalizePerformanceTimingLeniencyPreset('loose')).toBe('normal');
    expect(normalizePerformanceTimingLeniencyPreset(null)).toBe('normal');
  });

  it('resolves wider windows for more forgiving presets', () => {
    const prompt = createPrompt(500);
    expect(resolvePerformanceTimingForgivenessWindowMs(prompt, 'strict')).toBe(60);
    expect(resolvePerformanceTimingForgivenessWindowMs(prompt, 'normal')).toBe(90);
    expect(resolvePerformanceTimingForgivenessWindowMs(prompt, 'forgiving')).toBe(120);
  });

  it('forgives attempts near prompt start and around the nominal beat boundary', () => {
    const prompt = createPrompt(500);

    expect(
      shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: 1000,
        nowMs: 1060,
        preset: 'normal',
      })
    ).toBe(true);

    expect(
      shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: 1000,
        nowMs: 1490,
        preset: 'normal',
      })
    ).toBe(true);

    expect(
      shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: 1000,
        nowMs: 1300,
        preset: 'normal',
      })
    ).toBe(false);
  });

  it('makes strict timing reject attempts that forgiving mode still accepts', () => {
    const prompt = createPrompt(500);

    expect(
      shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: 1000,
        nowMs: 1115,
        preset: 'strict',
      })
    ).toBe(false);

    expect(
      shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: 1000,
        nowMs: 1115,
        preset: 'forgiving',
      })
    ).toBe(true);
  });
});
