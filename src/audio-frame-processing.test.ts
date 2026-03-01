import { describe, expect, it } from 'vitest';
import {
  analyzeMonophonicFrame,
  analyzePolyphonicFrame,
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
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'A',
    });

    expect(result.withinRange).toBe(false);
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
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'A',
    });

    expect(result.detectedNote).toBe('A');
    expect(result.nextStableNoteCounter).toBe(3);
    expect(result.isStableMatch).toBe(true);
    expect(result.isStableMismatch).toBe(false);
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
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => 'B',
    });

    expect(result.detectedNote).toBe('B');
    expect(result.nextStableNoteCounter).toBe(3);
    expect(result.isStableMatch).toBe(false);
    expect(result.isStableMismatch).toBe(true);
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
      requiredStableFrames: 3,
      targetNote: 'A',
      noteResolver: () => null,
    });

    expect(result.nextLastPitches).toEqual([435, 440]);
    expect(result.nextLastNote).toBe('A');
    expect(result.nextStableNoteCounter).toBe(2);
    expect(result.isStableMatch).toBe(false);
    expect(result.isStableMismatch).toBe(false);
  });
});
