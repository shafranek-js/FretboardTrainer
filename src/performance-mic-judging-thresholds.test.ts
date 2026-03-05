import { describe, expect, it } from 'vitest';
import { resolvePerformanceMicJudgingThresholds } from './performance-mic-judging-thresholds';

describe('resolvePerformanceMicJudgingThresholds', () => {
  it('accepts clearly stable confident input', () => {
    const result = resolvePerformanceMicJudgingThresholds({
      smoothedConfidence: 0.72,
      rawConfidence: 0.8,
      smoothedVoicing: 0.7,
      rawVoicing: 0.76,
    });

    expect(result.confidenceAccepted).toBe(true);
    expect(result.voicingAccepted).toBe(true);
  });

  it('accepts borderline clean attacks that would be too strict for ema-only gating', () => {
    const result = resolvePerformanceMicJudgingThresholds({
      smoothedConfidence: 0.46,
      rawConfidence: 0.58,
      smoothedVoicing: 0.43,
      rawVoicing: 0.55,
    });

    expect(result.confidenceAccepted).toBe(true);
    expect(result.voicingAccepted).toBe(true);
  });

  it('accepts low-energy but coherent built-in-mic frames in performance mode', () => {
    const result = resolvePerformanceMicJudgingThresholds({
      smoothedConfidence: 0.41,
      rawConfidence: 0.47,
      smoothedVoicing: 0.39,
      rawVoicing: 0.45,
    });

    expect(result.confidenceAccepted).toBe(true);
    expect(result.voicingAccepted).toBe(true);
  });

  it('rejects genuinely weak low-confidence low-voicing frames', () => {
    const result = resolvePerformanceMicJudgingThresholds({
      smoothedConfidence: 0.28,
      rawConfidence: 0.34,
      smoothedVoicing: 0.25,
      rawVoicing: 0.31,
    });

    expect(result.confidenceAccepted).toBe(false);
    expect(result.voicingAccepted).toBe(false);
  });
});
