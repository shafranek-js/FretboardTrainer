import { describe, expect, it } from 'vitest';
import {
  resolvePerformanceMicDropHoldMs,
  resolvePerformanceRequiredStableFrames,
  resolvePerformanceSilenceResetAfterFrames,
} from './performance-mic-adaptive-gating';

describe('performance-mic-adaptive-gating', () => {
  it('resolves shorter drop-hold for short events and higher for long events', () => {
    expect(resolvePerformanceMicDropHoldMs(140)).toBe(68);
    expect(resolvePerformanceMicDropHoldMs(300)).toBe(144);
    expect(resolvePerformanceMicDropHoldMs(900)).toBe(180);
    expect(resolvePerformanceMicDropHoldMs(null)).toBe(180);
  });

  it('resolves fewer silence reset frames for short notes', () => {
    expect(resolvePerformanceSilenceResetAfterFrames(160)).toBe(3);
    expect(resolvePerformanceSilenceResetAfterFrames(260)).toBe(4);
    expect(resolvePerformanceSilenceResetAfterFrames(420)).toBe(5);
    expect(resolvePerformanceSilenceResetAfterFrames(900)).toBe(6);
    expect(resolvePerformanceSilenceResetAfterFrames(undefined)).toBe(6);
  });

  it('uses 1 stable frame for very short notes in performance mode', () => {
    expect(resolvePerformanceRequiredStableFrames(120)).toBe(1);
    expect(resolvePerformanceRequiredStableFrames(180)).toBe(1);
    expect(resolvePerformanceRequiredStableFrames(240)).toBe(1);
    expect(resolvePerformanceRequiredStableFrames(281)).toBe(1);
    expect(resolvePerformanceRequiredStableFrames(361)).toBe(2);
    expect(resolvePerformanceRequiredStableFrames(null)).toBe(2);
  });
});
