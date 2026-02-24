export type StableMonophonicReactionPlan =
  | { kind: 'free_highlight' }
  | { kind: 'rhythm_feedback' }
  | { kind: 'success' }
  | { kind: 'ignore_no_prompt' }
  | {
      kind: 'mismatch';
      shouldDrawTargetFretboard: boolean;
      targetNote: string | null;
      targetString: string | null;
      cooldownDelayMs: number;
    };

export interface StableMonophonicReactionPlanInput {
  trainingMode: string;
  detectedNote: string;
  hasCurrentPrompt: boolean;
  promptTargetNote: string | null;
  promptTargetString: string | null;
  showingAllNotes: boolean;
}

export function buildStableMonophonicReactionPlan({
  trainingMode,
  detectedNote,
  hasCurrentPrompt,
  promptTargetNote,
  promptTargetString,
  showingAllNotes,
}: StableMonophonicReactionPlanInput): StableMonophonicReactionPlan {
  if (trainingMode === 'free') {
    return { kind: 'free_highlight' };
  }

  if (trainingMode === 'rhythm') {
    return { kind: 'rhythm_feedback' };
  }

  if (promptTargetNote && detectedNote === promptTargetNote) {
    return { kind: 'success' };
  }

  if (!hasCurrentPrompt) {
    return { kind: 'ignore_no_prompt' };
  }

  return {
    kind: 'mismatch',
    shouldDrawTargetFretboard: Boolean(promptTargetNote && !showingAllNotes),
    targetNote: promptTargetNote,
    targetString: promptTargetString,
    cooldownDelayMs: 1500,
  };
}

export type MidiPolyphonicReactionPlan =
  | { kind: 'ignore' }
  | { kind: 'success' }
  | { kind: 'wait_for_more_notes' }
  | { kind: 'mismatch'; cooldownDelayMs: number };

export interface MidiPolyphonicReactionPlanInput {
  hasPrompt: boolean;
  targetChordNotes: string[];
  eventKind: 'noteon' | 'noteoff';
  heldNoteNames: string[];
  matchesTargetChord: boolean;
}

export function buildMidiPolyphonicReactionPlan({
  hasPrompt,
  targetChordNotes,
  eventKind,
  heldNoteNames,
  matchesTargetChord,
}: MidiPolyphonicReactionPlanInput): MidiPolyphonicReactionPlan {
  if (!hasPrompt) {
    return { kind: 'ignore' };
  }

  const uniqueTargetNotes = [...new Set(targetChordNotes)];
  if (uniqueTargetNotes.length === 0) {
    return { kind: 'ignore' };
  }

  if (eventKind === 'noteoff' && heldNoteNames.length === 0) {
    return { kind: 'ignore' };
  }

  if (matchesTargetChord) {
    return { kind: 'success' };
  }

  const heldUniqueCount = new Set(heldNoteNames).size;
  if (heldUniqueCount < uniqueTargetNotes.length) {
    return { kind: 'wait_for_more_notes' };
  }

  return { kind: 'mismatch', cooldownDelayMs: 1200 };
}

export type AudioPolyphonicReactionPlan =
  | { kind: 'none' }
  | { kind: 'success' }
  | { kind: 'mismatch'; cooldownDelayMs: number; shouldDrawFretboardHint: boolean };

export interface AudioPolyphonicReactionPlanInput {
  isStableMatch: boolean;
  isStableMismatch: boolean;
  showingAllNotes: boolean;
}

export function buildAudioPolyphonicReactionPlan({
  isStableMatch,
  isStableMismatch,
  showingAllNotes,
}: AudioPolyphonicReactionPlanInput): AudioPolyphonicReactionPlan {
  if (isStableMatch) {
    return { kind: 'success' };
  }

  if (!isStableMismatch) {
    return { kind: 'none' };
  }

  return {
    kind: 'mismatch',
    cooldownDelayMs: 1500,
    shouldDrawFretboardHint: !showingAllNotes,
  };
}

export type AudioMonophonicReactionPlan =
  | { kind: 'none' }
  | { kind: 'stable_note'; detectedNote: string };

export interface AudioMonophonicReactionPlanInput {
  detectedNote: string | null;
  nextStableNoteCounter: number;
  requiredStableFrames: number;
}

export function buildAudioMonophonicReactionPlan({
  detectedNote,
  nextStableNoteCounter,
  requiredStableFrames,
}: AudioMonophonicReactionPlanInput): AudioMonophonicReactionPlan {
  if (!detectedNote || nextStableNoteCounter < requiredStableFrames) {
    return { kind: 'none' };
  }

  return { kind: 'stable_note', detectedNote };
}

export type CalibrationFrameReactionPlan =
  | { kind: 'ignore' }
  | { kind: 'accept_sample'; progressPercent: number; shouldFinishCalibration: boolean };

export interface CalibrationFrameReactionPlanInput {
  accepted: boolean;
  progressPercent: number;
  isComplete: boolean;
}

export function buildCalibrationFrameReactionPlan({
  accepted,
  progressPercent,
  isComplete,
}: CalibrationFrameReactionPlanInput): CalibrationFrameReactionPlan {
  if (!accepted) {
    return { kind: 'ignore' };
  }

  return {
    kind: 'accept_sample',
    progressPercent,
    shouldFinishCalibration: isComplete,
  };
}
