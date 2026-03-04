import { describe, expect, it } from 'vitest';
import { shouldReportPerformanceMicUncertainFrame } from './performance-mic-uncertain';

describe('performance-mic-uncertain', () => {
  it('reports a fresh weak onset inside the current prompt window', () => {
    expect(
      shouldReportPerformanceMicUncertainFrame({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1080,
        attackAccepted: false,
        holdAccepted: true,
        confidenceAccepted: true,
        voicingAccepted: true,
        lastReportedOnsetNote: null,
        lastReportedOnsetAtMs: null,
      })
    ).toBe(true);
  });

  it('does not report when the frame is already accepted', () => {
    expect(
      shouldReportPerformanceMicUncertainFrame({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1080,
        attackAccepted: true,
        holdAccepted: true,
        confidenceAccepted: true,
        voicingAccepted: true,
        lastReportedOnsetNote: null,
        lastReportedOnsetAtMs: null,
      })
    ).toBe(false);
  });

  it('does not report the same uncertain onset twice', () => {
    expect(
      shouldReportPerformanceMicUncertainFrame({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1080,
        attackAccepted: false,
        holdAccepted: true,
        confidenceAccepted: true,
        voicingAccepted: true,
        lastReportedOnsetNote: 'A',
        lastReportedOnsetAtMs: 1020,
      })
    ).toBe(false);
  });

  it('reports a frame with low pitch confidence even when attack and hold passed', () => {
    expect(
      shouldReportPerformanceMicUncertainFrame({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1080,
        attackAccepted: true,
        holdAccepted: true,
        confidenceAccepted: false,
        voicingAccepted: true,
        lastReportedOnsetNote: null,
        lastReportedOnsetAtMs: null,
      })
    ).toBe(true);
  });

  it('reports an early weak onset after latency compensation shifts the prompt window earlier', () => {
    expect(
      shouldReportPerformanceMicUncertainFrame({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 880,
        promptStartedAtMs: 900,
        nowMs: 960,
        attackAccepted: false,
        holdAccepted: true,
        confidenceAccepted: true,
        voicingAccepted: true,
        lastReportedOnsetNote: null,
        lastReportedOnsetAtMs: null,
      })
    ).toBe(true);
  });

  it('reports a low-voicing frame even when attack, hold, and confidence passed', () => {
    expect(
      shouldReportPerformanceMicUncertainFrame({
        detectedNote: 'A',
        noteFirstDetectedAtMs: 1020,
        promptStartedAtMs: 1000,
        nowMs: 1080,
        attackAccepted: true,
        holdAccepted: true,
        confidenceAccepted: true,
        voicingAccepted: false,
        lastReportedOnsetNote: null,
        lastReportedOnsetAtMs: null,
      })
    ).toBe(true);
  });
});
