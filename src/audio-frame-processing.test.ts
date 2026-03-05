import { describe, expect, it } from 'vitest';
import {
  analyzeMonophonicFrame,
  analyzePolyphonicFrame,
  computeMonophonicPitchConfidence,
  calculateRmsLevel,
  evaluateCalibrationSample,
} from './audio-frame-processing';

describe('calculateRmsLevel', () => {
  it('returns 0 for empty or silent buffers', () => {
    expect(calculateRmsLevel(new Float32Array([]))).toBe(0);
    expect(calculateRmsLevel(new Float32Array([0, 0, 0]))).toBe(0);
  });

  it('calculates RMS for non-zero buffers', () => {
    const rms = calculateRmsLevel(new Float32Array([1, -1]));
    expect(rms).toBeCloseTo(1, 6);
  });
});

describe('evaluateCalibrationSample', () => {
  it('accepts values within tolerance and reports progress', () => {
    const result = evaluateCalibrationSample({
      frequency: 444,
      expectedFrequency: 440,
      currentSampleCount: 10,
      requiredSamples: 30,
    });

    expect(result.accepted).toBe(true);
    expect(result.nextSampleCount).toBe(11);
    expect(result.progressPercent).toBeCloseTo((11 / 30) * 100, 6);
    expect(result.isComplete).toBe(false);
  });

  it('rejects out-of-range values', () => {
    const result = evaluateCalibrationSample({
      frequency: 520,
      expectedFrequency: 440,
      currentSampleCount: 10,
      requiredSamples: 30,
    });

    expect(result.accepted).toBe(false);
    expect(result.nextSampleCount).toBe(10);
    expect(result.isComplete).toBe(false);
  });
});

describe('analyzePolyphonicFrame', () => {
  it('produces stable match when required frames are reached', () => {
    const noteEnergies = { C: 1.0, E: 0.9, G: 0.8, D: 0.02 };
    const result = analyzePolyphonicFrame({
      noteEnergies,
      lastDetectedChord: 'C,E,G',
      stableChordCounter: 2,
      requiredStableFrames: 3,
      targetChordNotes: ['C', 'E', 'G'],
    });

    expect(result.detectedNotesText).toBe('C,E,G');
    expect(result.nextStableChordCounter).toBe(3);
    expect(result.isStableMatch).toBe(true);
    expect(result.isStableMismatch).toBe(false);
  });

  it('produces stable mismatch when detected notes do not match target', () => {
    const noteEnergies = { D: 1.0, F: 0.9, A: 0.8 };
    const result = analyzePolyphonicFrame({
      noteEnergies,
      lastDetectedChord: 'A,D,F',
      stableChordCounter: 2,
      requiredStableFrames: 3,
      targetChordNotes: ['C', 'E', 'G'],
    });

    expect(result.detectedNotesText).toBe('A,D,F');
    expect(result.nextStableChordCounter).toBe(3);
    expect(result.isStableMatch).toBe(false);
    expect(result.isStableMismatch).toBe(true);
  });

  it('produces stable mismatch when a non-target peak dominates a near-match chord', () => {
    const noteEnergies = { C: 1.0, E: 0.92, G: 0.88, F: 0.97, A: 0.65 };
    const result = analyzePolyphonicFrame({
      noteEnergies,
      lastDetectedChord: 'A,C,E,F,G',
      stableChordCounter: 2,
      requiredStableFrames: 3,
      targetChordNotes: ['C', 'E', 'G'],
    });

    expect(result.detectedNotesText).toBe('A,C,E,F,G');
    expect(result.nextStableChordCounter).toBe(3);
    expect(result.isStableMatch).toBe(false);
    expect(result.isStableMismatch).toBe(true);
  });
});

describe('analyzeMonophonicFrame', () => {
  it('keeps state unchanged when frequency is out of range', () => {
    const result = analyzeMonophonicFrame({
      frequency: 30,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 2,
      lastPitches: [220],
      lastNote: 'A',
      stableNoteCounter: 2,
      previousConfidenceEma: 0.7,
      previousVoicingEma: 0.5,
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'A',
    });

    expect(result.withinRange).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.rawConfidence).toBe(0);
    expect(result.isConfident).toBe(false);
    expect(result.nextConfidenceEma).toBeCloseTo(0.42, 3);
    expect(result.voicingConfidence).toBe(0);
    expect(result.rawVoicingConfidence).toBe(0);
    expect(result.isVoiced).toBe(false);
    expect(result.nextVoicingEma).toBeCloseTo(0.275, 3);
    expect(result.nextLastPitches).toEqual([220]);
    expect(result.nextLastNote).toBe('A');
    expect(result.nextStableNoteCounter).toBe(2);
  });

  it('reports stable match when note repeats enough times', () => {
    const result = analyzeMonophonicFrame({
      frequency: 440,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 2,
      lastPitches: [438],
      lastNote: 'A',
      stableNoteCounter: 2,
      previousConfidenceEma: 0.5,
      previousVoicingEma: 0.5,
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'A',
    });

    expect(result.detectedNote).toBe('A');
    expect(result.nextStableNoteCounter).toBe(3);
    expect(result.isStableMatch).toBe(true);
    expect(result.isStableMismatch).toBe(false);
    expect(result.isConfident).toBe(true);
    expect(result.isVoiced).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.rawConfidence).toBeGreaterThan(0.9);
  });

  it('reports stable mismatch for wrong note', () => {
    const result = analyzeMonophonicFrame({
      frequency: 494,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 2,
      lastPitches: [492],
      lastNote: 'B',
      stableNoteCounter: 2,
      previousConfidenceEma: 0.5,
      previousVoicingEma: 0.5,
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'B',
    });

    expect(result.detectedNote).toBe('B');
    expect(result.nextStableNoteCounter).toBe(3);
    expect(result.isStableMatch).toBe(false);
    expect(result.isStableMismatch).toBe(true);
    expect(result.isConfident).toBe(true);
    expect(result.isVoiced).toBe(true);
    expect(result.rawConfidence).toBeGreaterThan(0.9);
  });

  it('updates pitch history but not stability when note resolver returns null', () => {
    const result = analyzeMonophonicFrame({
      frequency: 440,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 2,
      lastPitches: [430, 435],
      lastNote: 'A',
      stableNoteCounter: 2,
      previousConfidenceEma: 0.4,
      previousVoicingEma: 0.4,
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => null,
    });

    expect(result.nextLastPitches).toEqual([435, 440]);
    expect(result.nextLastNote).toBe('A');
    expect(result.nextStableNoteCounter).toBe(2);
    expect(result.isStableMatch).toBe(false);
    expect(result.isStableMismatch).toBe(false);
    expect(result.isConfident).toBe(false);
    expect(result.nextConfidenceEma).toBeCloseTo(0.28, 3);
    expect(result.isVoiced).toBe(false);
    expect(result.nextVoicingEma).toBeCloseTo(0.24, 3);
  });
});

describe('computeMonophonicPitchConfidence', () => {
  it('returns high confidence for tight stable pitch history', () => {
    const result = computeMonophonicPitchConfidence({
      lastPitches: [439.8, 440.2],
      smoothedFrequency: 440,
      nextStableNoteCounter: 3,
      requiredStableFrames: 3,
    });

    expect(result.pitchSpreadCents).toBeLessThan(3);
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.isConfident).toBe(true);
  });

  it('returns low confidence for wide unstable pitch history', () => {
    const result = computeMonophonicPitchConfidence({
      lastPitches: [410, 455],
      smoothedFrequency: 432.5,
      nextStableNoteCounter: 1,
      requiredStableFrames: 3,
    });

    expect(result.pitchSpreadCents).toBeGreaterThan(80);
    expect(result.confidence).toBeLessThan(0.4);
    expect(result.isConfident).toBe(false);
  });

  it('keeps confidence alive through mild wobble via hysteresis', () => {
    const result = analyzeMonophonicFrame({
      frequency: 440,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 2,
      lastPitches: [438, 441],
      lastNote: 'A',
      stableNoteCounter: 2,
      previousConfidenceEma: 0.7,
      previousVoicingEma: 0.72,
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'A',
    });

    expect(result.rawConfidence).toBeGreaterThan(0.7);
    expect(result.confidence).toBeGreaterThan(0.65);
    expect(result.isConfident).toBe(true);
    expect(result.voicingConfidence).toBeGreaterThan(0.65);
    expect(result.isVoiced).toBe(true);
  });

  it('keeps voiced state alive through mild wobble via hysteresis', () => {
    const result = analyzeMonophonicFrame({
      frequency: 440,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 3,
      lastPitches: [438, 441, 439],
      lastNote: 'A',
      stableNoteCounter: 2,
      previousConfidenceEma: 0.62,
      previousVoicingEma: 0.71,
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'A',
    });

    expect(result.rawVoicingConfidence).toBeGreaterThan(0.7);
    expect(result.voicingConfidence).toBeGreaterThan(0.68);
    expect(result.isVoiced).toBe(true);
  });

  it('ramps confidence/voicing EMA faster in performance_fast mode', () => {
    const baseInput = {
      frequency: 440,
      minFrequency: 50,
      maxFrequency: 1000,
      maxPitchWindow: 2,
      lastPitches: [439.5],
      lastNote: 'A',
      stableNoteCounter: 1,
      previousConfidenceEma: 0.2,
      previousVoicingEma: 0.2,
      requiredStableFrames: 2,
      targetNote: 'A',
      noteResolver: () => 'A',
    } as const;

    const defaultResult = analyzeMonophonicFrame({
      ...baseInput,
      emaPreset: 'default',
    });
    const performanceResult = analyzeMonophonicFrame({
      ...baseInput,
      emaPreset: 'performance_fast',
    });

    expect(performanceResult.nextConfidenceEma).toBeGreaterThan(defaultResult.nextConfidenceEma);
    expect(performanceResult.nextVoicingEma).toBeGreaterThan(defaultResult.nextVoicingEma);
  });
});
