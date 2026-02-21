import {
  areChordNotesMatchingRobust,
  detectLikelyChordNotes,
  type NoteEnergies,
} from './dsp/chord';

export function calculateRmsLevel(buffer: Float32Array): number {
  if (!buffer || buffer.length === 0) return 0;
  const sumSquares = buffer.reduce((sum, value) => sum + value * value, 0);
  return Math.sqrt(sumSquares / buffer.length);
}

export interface CalibrationSampleInput {
  frequency: number;
  expectedFrequency: number;
  currentSampleCount: number;
  requiredSamples: number;
  toleranceRatio?: number;
}

export interface CalibrationSampleResult {
  accepted: boolean;
  nextSampleCount: number;
  progressPercent: number;
  isComplete: boolean;
}

export function evaluateCalibrationSample({
  frequency,
  expectedFrequency,
  currentSampleCount,
  requiredSamples,
  toleranceRatio = 0.15,
}: CalibrationSampleInput): CalibrationSampleResult {
  const lowerBound = expectedFrequency * (1 - toleranceRatio);
  const upperBound = expectedFrequency * (1 + toleranceRatio);
  const accepted = frequency >= lowerBound && frequency <= upperBound;
  const nextSampleCount = accepted ? currentSampleCount + 1 : currentSampleCount;
  const safeRequiredSamples = Math.max(1, requiredSamples);
  const progressPercent = Math.max(0, Math.min(100, (nextSampleCount / safeRequiredSamples) * 100));

  return {
    accepted,
    nextSampleCount,
    progressPercent,
    isComplete: nextSampleCount >= safeRequiredSamples,
  };
}

export interface PolyphonicFrameInput {
  noteEnergies: NoteEnergies;
  lastDetectedChord: string;
  stableChordCounter: number;
  requiredStableFrames: number;
  targetChordNotes: string[];
}

export interface PolyphonicFrameResult {
  detectedNotesText: string;
  nextStableChordCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
}

export function analyzePolyphonicFrame({
  noteEnergies,
  lastDetectedChord,
  stableChordCounter,
  requiredStableFrames,
  targetChordNotes,
}: PolyphonicFrameInput): PolyphonicFrameResult {
  const detectedNotes = detectLikelyChordNotes(noteEnergies);
  const detectedNotesText = [...detectedNotes].sort().join(',');

  const nextStableChordCounter =
    detectedNotesText.length > 0 && detectedNotesText === lastDetectedChord
      ? stableChordCounter + 1
      : 1;

  if (nextStableChordCounter < requiredStableFrames) {
    return {
      detectedNotesText,
      nextStableChordCounter,
      isStableMatch: false,
      isStableMismatch: false,
    };
  }

  const isStableMatch = areChordNotesMatchingRobust(noteEnergies, targetChordNotes);
  return {
    detectedNotesText,
    nextStableChordCounter,
    isStableMatch,
    isStableMismatch: !isStableMatch,
  };
}

export interface MonophonicFrameInput {
  frequency: number;
  minFrequency: number;
  maxFrequency: number;
  maxPitchWindow: number;
  lastPitches: number[];
  lastNote: string | null;
  stableNoteCounter: number;
  requiredStableFrames: number;
  targetNote: string | null;
  noteResolver: (frequency: number) => string | null;
}

export interface MonophonicFrameResult {
  withinRange: boolean;
  detectedNote: string | null;
  smoothedFrequency: number | null;
  nextLastPitches: number[];
  nextLastNote: string | null;
  nextStableNoteCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
}

export function analyzeMonophonicFrame({
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
}: MonophonicFrameInput): MonophonicFrameResult {
  if (frequency <= minFrequency || frequency >= maxFrequency) {
    return {
      withinRange: false,
      detectedNote: null,
      smoothedFrequency: null,
      nextLastPitches: lastPitches,
      nextLastNote: lastNote,
      nextStableNoteCounter: stableNoteCounter,
      isStableMatch: false,
      isStableMismatch: false,
    };
  }

  const nextLastPitches = [...lastPitches, frequency].slice(-Math.max(1, maxPitchWindow));
  const smoothedFrequency =
    nextLastPitches.reduce((sum, current) => sum + current, 0) / nextLastPitches.length;
  const detectedNote = noteResolver(smoothedFrequency);

  if (!detectedNote) {
    return {
      withinRange: true,
      detectedNote: null,
      smoothedFrequency,
      nextLastPitches,
      nextLastNote: lastNote,
      nextStableNoteCounter: stableNoteCounter,
      isStableMatch: false,
      isStableMismatch: false,
    };
  }

  const nextStableNoteCounter = detectedNote === lastNote ? stableNoteCounter + 1 : 1;
  const isStable = nextStableNoteCounter >= requiredStableFrames;
  const isStableMatch = isStable && detectedNote === targetNote;

  return {
    withinRange: true,
    detectedNote,
    smoothedFrequency,
    nextLastPitches,
    nextLastNote: detectedNote,
    nextStableNoteCounter,
    isStableMatch,
    isStableMismatch: isStable && !isStableMatch,
  };
}
