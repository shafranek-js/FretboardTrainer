import { describe, expect, it } from 'vitest';
import {
  resolvePerformanceMicOnsetWindowMs,
  shouldJudgePerformanceMicOnset,
} from './performance-mic-onset-gate';

describe('performance-mic-onset-gate', () => {
  it('accepts a fresh onset inside the prompt window', () => {
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1100,
        lastJudgedOnsetNote: null,
        lastJudgedOnsetAtMs: null,
      })
    ).toBe(true);
  });

  it('rejects the same onset after it has already been judged', () => {
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1100,
        lastJudgedOnsetNote: 'A',
        lastJudgedOnsetAtMs: 1020,
      })
    ).toBe(false);
  });

  it('rejects stale onsets that started before the current prompt window', () => {
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 800,
        promptStartedAtMs: 1000,
        nowMs: 1100,
        lastJudgedOnsetNote: null,
        lastJudgedOnsetAtMs: null,
      })
    ).toBe(false);
  });

  it('rejects overly old sustained onsets', () => {
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1000,
        promptStartedAtMs: 1000,
        nowMs: 1600,
        lastJudgedOnsetNote: null,
        lastJudgedOnsetAtMs: null,
      })
    ).toBe(false);
  });

  it('accepts a slightly early onset when latency compensation shifts the prompt window earlier', () => {
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 880,
        promptStartedAtMs: 900,
        nowMs: 980,
        lastJudgedOnsetNote: null,
        lastJudgedOnsetAtMs: null,
      })
    ).toBe(true);
  });

  it('scales onset window from event duration and leniency preset', () => {
    expect(
      resolvePerformanceMicOnsetWindowMs({ eventDurationMs: 250, leniencyPreset: 'strict' })
    ).toEqual({
      earlyWindowMs: 63,
      maxOnsetAgeMs: 288,
    });
    expect(
      resolvePerformanceMicOnsetWindowMs({ eventDurationMs: 250, leniencyPreset: 'normal' })
    ).toEqual({
      earlyWindowMs: 105,
      maxOnsetAgeMs: 388,
    });
    expect(
      resolvePerformanceMicOnsetWindowMs({ eventDurationMs: 250, leniencyPreset: 'forgiving' })
    ).toEqual({
      earlyWindowMs: 138,
      maxOnsetAgeMs: 500,
    });
  });

  it('accepts earlier onsets for forgiving preset on short events', () => {
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 870,
        promptStartedAtMs: 1000,
        nowMs: 1020,
        lastJudgedOnsetNote: null,
        lastJudgedOnsetAtMs: null,
        eventDurationMs: 250,
        leniencyPreset: 'forgiving',
      })
    ).toBe(true);
    expect(
      shouldJudgePerformanceMicOnset({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 870,
        promptStartedAtMs: 1000,
        nowMs: 1020,
        lastJudgedOnsetNote: null,
        lastJudgedOnsetAtMs: null,
        eventDurationMs: 250,
        leniencyPreset: 'strict',
      })
    ).toBe(false);
  });
});
