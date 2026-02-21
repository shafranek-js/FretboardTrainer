import { describe, expect, it } from 'vitest';
import {
  detectCalibrationFrame,
  detectMonophonicFrame,
  detectPolyphonicFrame,
  evaluateSilenceGate,
} from './audio-detection-handlers';

describe('evaluateSilenceGate', () => {
  it('increments silence and requests reset after threshold', () => {
    const first = evaluateSilenceGate({
      volume: 0.01,
      volumeThreshold: 0.02,
      consecutiveSilence: 0,
      resetAfterFrames: 2,
    });
    const second = evaluateSilenceGate({
      volume: 0.01,
      volumeThreshold: 0.02,
      consecutiveSilence: first.nextConsecutiveSilence,
      resetAfterFrames: 2,
    });

    expect(first).toEqual({
      isBelowThreshold: true,
      nextConsecutiveSilence: 1,
      shouldResetTracking: false,
    });
    expect(second).toEqual({
      isBelowThreshold: true,
      nextConsecutiveSilence: 2,
      shouldResetTracking: true,
    });
  });

  it('resets silence counter when volume is above threshold', () => {
    const result = evaluateSilenceGate({
      volume: 0.03,
      volumeThreshold: 0.02,
      consecutiveSilence: 5,
    });

    expect(result).toEqual({
      isBelowThreshold: false,
      nextConsecutiveSilence: 0,
      shouldResetTracking: false,
    });
  });
});

describe('detectCalibrationFrame', () => {
  it('delegates calibration acceptance/progress rules', () => {
    const result = detectCalibrationFrame({
      frequency: 442,
      expectedFrequency: 440,
      currentSampleCount: 29,
      requiredSamples: 30,
    });

    expect(result.accepted).toBe(true);
    expect(result.nextSampleCount).toBe(30);
    expect(result.isComplete).toBe(true);
    expect(result.progressPercent).toBe(100);
  });
});

describe('detectMonophonicFrame', () => {
  it('uses defaults and reports stable note match', () => {
    const result = detectMonophonicFrame({
      frequency: 440,
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
  });
});

describe('detectPolyphonicFrame', () => {
  it('integrates spectrum conversion and stable matching', () => {
    const spectrum = new Float32Array(2048).fill(-120);
    spectrum[261] = -10;
    spectrum[329] = -12;
    spectrum[392] = -14;

    const result = detectPolyphonicFrame({
      spectrum,
      sampleRate: 4096,
      fftSize: 4096,
      calibratedA4: 440,
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
});
