import { describe, expect, it, vi } from 'vitest';

const { detectPolyphonicFrameMock } = vi.hoisted(() => ({
  detectPolyphonicFrameMock: vi.fn(),
}));

vi.mock('./audio-detection-handlers', () => ({
  detectPolyphonicFrame: detectPolyphonicFrameMock,
}));

import {
  detectMicPolyphonicFrame,
  registerMicPolyphonicDetectorAdapter,
  normalizeMicPolyphonicDetectorProvider,
  unregisterMicPolyphonicDetectorAdapter,
} from './mic-polyphonic-detector';

describe('mic-polyphonic-detector', () => {
  it('normalizes unknown providers to spectrum', () => {
    expect(normalizeMicPolyphonicDetectorProvider('spectrum')).toBe('spectrum');
    expect(normalizeMicPolyphonicDetectorProvider('essentia' as never)).toBe('essentia_experimental');
    expect(normalizeMicPolyphonicDetectorProvider('essentia-experimental')).toBe('essentia_experimental');
    expect(normalizeMicPolyphonicDetectorProvider(null)).toBe('spectrum');
  });

  it('wraps baseline detector and parses detected notes text', () => {
    detectPolyphonicFrameMock.mockReturnValue({
      detectedNotesText: 'E,B,E',
      nextStableChordCounter: 3,
      isStableMatch: false,
      isStableMismatch: true,
    });

    const result = detectMicPolyphonicFrame({
      spectrum: new Float32Array(8),
      sampleRate: 44100,
      fftSize: 2048,
      calibratedA4: 440,
      lastDetectedChord: '',
      stableChordCounter: 0,
      requiredStableFrames: 3,
      targetChordNotes: ['E', 'B'],
      provider: 'spectrum',
    });

    expect(detectPolyphonicFrameMock).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe('spectrum');
    expect(result.detectedNotesText).toBe('E,B,E');
    expect(result.detectedNoteNames).toEqual(['E', 'B']);
    expect(result.isStableMismatch).toBe(true);
  });

  it('falls back to spectrum when requested experimental provider is not registered', () => {
    detectPolyphonicFrameMock.mockReturnValue({
      detectedNotesText: 'C,E',
      nextStableChordCounter: 2,
      isStableMatch: true,
      isStableMismatch: false,
    });

    const result = detectMicPolyphonicFrame({
      spectrum: new Float32Array(8),
      sampleRate: 44100,
      fftSize: 2048,
      calibratedA4: 440,
      lastDetectedChord: '',
      stableChordCounter: 0,
      requiredStableFrames: 3,
      targetChordNotes: ['C', 'E'],
      provider: 'essentia_experimental',
    });

    expect(result.provider).toBe('spectrum');
    expect(result.requestedProvider).toBe('essentia_experimental');
    expect(result.fallbackFrom).toBe('essentia_experimental');
    expect(result.warnings?.[0]).toMatch(/not available/i);
  });

  it('uses a registered experimental adapter when available', () => {
    detectPolyphonicFrameMock.mockReset();
    registerMicPolyphonicDetectorAdapter('essentia_experimental', {
      detect: () => ({
        detectedNotesText: 'A,C#',
        detectedNoteNames: ['A', 'C#'],
        nextStableChordCounter: 4,
        isStableMatch: true,
        isStableMismatch: false,
      }),
    });

    try {
      const result = detectMicPolyphonicFrame({
        spectrum: new Float32Array(8),
        sampleRate: 44100,
        fftSize: 2048,
        calibratedA4: 440,
        lastDetectedChord: '',
        stableChordCounter: 0,
        requiredStableFrames: 3,
        targetChordNotes: ['A', 'C#'],
        provider: 'essentia_experimental',
      });

      expect(detectPolyphonicFrameMock).not.toHaveBeenCalled();
      expect(result.provider).toBe('essentia_experimental');
      expect(result.requestedProvider).toBe('essentia_experimental');
      expect(result.detectedNoteNames).toEqual(['A', 'C#']);
      expect(result.isStableMatch).toBe(true);
    } finally {
      unregisterMicPolyphonicDetectorAdapter('essentia_experimental');
    }
  });
});
