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
  previousConfidenceEma: number;
  previousVoicingEma: number;
  requiredStableFrames: number;
  targetNote: string | null;
  noteResolver: (frequency: number) => string | null;
}

export interface MonophonicFrameResult {
  withinRange: boolean;
  detectedNote: string | null;
  smoothedFrequency: number | null;
  pitchSpreadCents: number | null;
  confidence: number;
  rawConfidence: number;
  isConfident: boolean;
  nextConfidenceEma: number;
  voicingConfidence: number;
  rawVoicingConfidence: number;
  isVoiced: boolean;
  nextVoicingEma: number;
  nextLastPitches: number[];
  nextLastNote: string | null;
  nextStableNoteCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function frequencyToCents(referenceFrequency: number, frequency: number) {
  if (
    !Number.isFinite(referenceFrequency) ||
    !Number.isFinite(frequency) ||
    referenceFrequency <= 0 ||
    frequency <= 0
  ) {
    return 0;
  }
  return 1200 * Math.log2(frequency / referenceFrequency);
}

export function computeMonophonicPitchConfidence(input: {
  lastPitches: number[];
  smoothedFrequency: number;
  nextStableNoteCounter: number;
  requiredStableFrames: number;
}) {
  const pitchSpreadCents =
    input.lastPitches.length <= 1
      ? 0
      : Math.max(
          ...input.lastPitches.map((pitch) =>
            Math.abs(frequencyToCents(input.smoothedFrequency, pitch))
          )
        );
  const stabilityScore = clamp(
    input.nextStableNoteCounter / Math.max(1, input.requiredStableFrames),
    0,
    1
  );
  const spreadScore = clamp(1 - Math.max(0, pitchSpreadCents - 8) / 40, 0, 1);
  const confidence = Number((stabilityScore * 0.6 + spreadScore * 0.4).toFixed(3));

  return {
    pitchSpreadCents,
    confidence,
    isConfident: confidence >= 0.58,
  };
}

export function computeMonophonicVoicingConfidence(input: {
  detectedNote: string | null;
  confidence: number;
  pitchSpreadCents: number | null;
  nextStableNoteCounter: number;
  requiredStableFrames: number;
}) {
  if (!input.detectedNote) {
    return {
      confidence: 0,
      isVoiced: false,
    };
  }

  const stabilityScore = clamp(
    input.nextStableNoteCounter / Math.max(1, input.requiredStableFrames),
    0,
    1
  );
  const spreadScore =
    typeof input.pitchSpreadCents === 'number'
      ? clamp(1 - Math.max(0, input.pitchSpreadCents - 6) / 55, 0, 1)
      : 0;
  const confidence = Number(
    (input.confidence * 0.55 + stabilityScore * 0.25 + spreadScore * 0.2).toFixed(3)
  );

  return {
    confidence,
    isVoiced: confidence >= 0.6,
  };
}

export function analyzeMonophonicFrame({
  frequency,
  minFrequency,
  maxFrequency,
  maxPitchWindow,
  lastPitches,
  lastNote,
  stableNoteCounter,
  previousConfidenceEma,
  previousVoicingEma,
  requiredStableFrames,
  targetNote,
  noteResolver,
}: MonophonicFrameInput): MonophonicFrameResult {
  if (frequency <= minFrequency || frequency >= maxFrequency) {
    return {
      withinRange: false,
      detectedNote: null,
      smoothedFrequency: null,
      pitchSpreadCents: null,
      confidence: 0,
      rawConfidence: 0,
      isConfident: false,
      nextConfidenceEma: Number((previousConfidenceEma * 0.6).toFixed(3)),
      voicingConfidence: 0,
      rawVoicingConfidence: 0,
      isVoiced: false,
      nextVoicingEma: Number((previousVoicingEma * 0.55).toFixed(3)),
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
      pitchSpreadCents: null,
      confidence: 0,
      rawConfidence: 0,
      isConfident: false,
      nextConfidenceEma: Number((previousConfidenceEma * 0.7).toFixed(3)),
      voicingConfidence: 0,
      rawVoicingConfidence: 0,
      isVoiced: false,
      nextVoicingEma: Number((previousVoicingEma * 0.6).toFixed(3)),
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
  const confidenceMetrics = computeMonophonicPitchConfidence({
    lastPitches: nextLastPitches,
    smoothedFrequency,
    nextStableNoteCounter,
    requiredStableFrames,
  });
  const nextConfidenceEma = Number(
    (
      previousConfidenceEma * 0.68 +
      confidenceMetrics.confidence * 0.32
    ).toFixed(3)
  );
  const confidenceThreshold = previousConfidenceEma >= 0.58 ? 0.5 : 0.64;
  const voicingMetrics = computeMonophonicVoicingConfidence({
    detectedNote,
    confidence: confidenceMetrics.confidence,
    pitchSpreadCents: confidenceMetrics.pitchSpreadCents,
    nextStableNoteCounter,
    requiredStableFrames,
  });
  const nextVoicingEma = Number(
    (
      previousVoicingEma * 0.7 +
      voicingMetrics.confidence * 0.3
    ).toFixed(3)
  );
  const voicingThreshold = previousVoicingEma >= 0.6 ? 0.48 : 0.6;

  return {
    withinRange: true,
    detectedNote,
    smoothedFrequency,
    pitchSpreadCents: confidenceMetrics.pitchSpreadCents,
    confidence: nextConfidenceEma,
    rawConfidence: confidenceMetrics.confidence,
    isConfident: nextConfidenceEma >= confidenceThreshold,
    nextConfidenceEma,
    voicingConfidence: nextVoicingEma,
    rawVoicingConfidence: voicingMetrics.confidence,
    isVoiced: nextVoicingEma >= voicingThreshold,
    nextVoicingEma,
    nextLastPitches,
    nextLastNote: detectedNote,
    nextStableNoteCounter,
    isStableMatch,
    isStableMismatch: isStable && !isStableMatch,
  };
}
