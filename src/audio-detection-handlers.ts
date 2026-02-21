import {
  analyzeMonophonicFrame,
  analyzePolyphonicFrame,
  evaluateCalibrationSample,
  type CalibrationSampleResult,
  type MonophonicFrameResult,
  type PolyphonicFrameResult,
} from './audio-frame-processing';
import { spectrumToNoteEnergies } from './dsp/chord';

const DEFAULT_MIN_MONO_FREQUENCY = 50;
const DEFAULT_MAX_MONO_FREQUENCY = 1000;
const DEFAULT_MONO_PITCH_WINDOW = 2;

export interface SilenceGateInput {
  volume: number;
  volumeThreshold: number;
  consecutiveSilence: number;
  resetAfterFrames?: number;
}

export interface SilenceGateResult {
  isBelowThreshold: boolean;
  nextConsecutiveSilence: number;
  shouldResetTracking: boolean;
}

export function evaluateSilenceGate({
  volume,
  volumeThreshold,
  consecutiveSilence,
  resetAfterFrames = 2,
}: SilenceGateInput): SilenceGateResult {
  if (volume < volumeThreshold) {
    const nextConsecutiveSilence = consecutiveSilence + 1;
    return {
      isBelowThreshold: true,
      nextConsecutiveSilence,
      shouldResetTracking: nextConsecutiveSilence >= resetAfterFrames,
    };
  }

  return {
    isBelowThreshold: false,
    nextConsecutiveSilence: 0,
    shouldResetTracking: false,
  };
}

export interface PolyphonicDetectionInput {
  spectrum: Float32Array;
  sampleRate: number;
  fftSize: number;
  calibratedA4: number;
  lastDetectedChord: string;
  stableChordCounter: number;
  requiredStableFrames: number;
  targetChordNotes: string[];
}

export function detectPolyphonicFrame({
  spectrum,
  sampleRate,
  fftSize,
  calibratedA4,
  lastDetectedChord,
  stableChordCounter,
  requiredStableFrames,
  targetChordNotes,
}: PolyphonicDetectionInput): PolyphonicFrameResult {
  const noteEnergies = spectrumToNoteEnergies(spectrum, sampleRate, fftSize, calibratedA4);

  return analyzePolyphonicFrame({
    noteEnergies,
    lastDetectedChord,
    stableChordCounter,
    requiredStableFrames,
    targetChordNotes,
  });
}

export interface CalibrationDetectionInput {
  frequency: number;
  expectedFrequency: number;
  currentSampleCount: number;
  requiredSamples: number;
}

export function detectCalibrationFrame({
  frequency,
  expectedFrequency,
  currentSampleCount,
  requiredSamples,
}: CalibrationDetectionInput): CalibrationSampleResult {
  return evaluateCalibrationSample({
    frequency,
    expectedFrequency,
    currentSampleCount,
    requiredSamples,
  });
}

export interface MonophonicDetectionInput {
  frequency: number;
  lastPitches: number[];
  lastNote: string | null;
  stableNoteCounter: number;
  requiredStableFrames: number;
  targetNote: string | null;
  noteResolver: (frequency: number) => string | null;
  minFrequency?: number;
  maxFrequency?: number;
  maxPitchWindow?: number;
}

export function detectMonophonicFrame({
  frequency,
  lastPitches,
  lastNote,
  stableNoteCounter,
  requiredStableFrames,
  targetNote,
  noteResolver,
  minFrequency = DEFAULT_MIN_MONO_FREQUENCY,
  maxFrequency = DEFAULT_MAX_MONO_FREQUENCY,
  maxPitchWindow = DEFAULT_MONO_PITCH_WINDOW,
}: MonophonicDetectionInput): MonophonicFrameResult {
  return analyzeMonophonicFrame({
    frequency,
    minFrequency,
    maxFrequency,
    maxPitchWindow,
    lastPitches,
    lastNote,
    stableNoteCounter,
    requiredStableFrames,
    targetNote,
    noteResolver,
  });
}
