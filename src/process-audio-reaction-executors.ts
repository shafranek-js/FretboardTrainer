import type {
  AudioMonophonicReactionPlan,
  AudioPolyphonicReactionPlan,
  CalibrationFrameReactionPlan,
} from './session-detection-reactions';

type ResultTone = 'neutral' | 'success' | 'error';

export function executeAudioPolyphonicReaction(input: {
  reactionPlan: AudioPolyphonicReactionPlan;
  detectedNotesText: string;
  onSuccess: () => void;
  onMismatchRecordAttempt: () => void;
  setResultMessage: (message: string, tone: ResultTone) => void;
  drawHintFretboard: () => void;
  scheduleCooldownRedraw: (delayMs: number) => void;
}) {
  const {
    reactionPlan,
    detectedNotesText,
    onSuccess,
    onMismatchRecordAttempt,
    setResultMessage,
    drawHintFretboard,
    scheduleCooldownRedraw,
  } = input;

  if (reactionPlan.kind === 'none') return;
  if (reactionPlan.kind === 'success') {
    onSuccess();
    return;
  }

  onMismatchRecordAttempt();
  setResultMessage(`Heard: ${detectedNotesText || '...'} [wrong]`, 'error');
  if (reactionPlan.shouldDrawFretboardHint) {
    drawHintFretboard();
    scheduleCooldownRedraw(reactionPlan.cooldownDelayMs);
  }
}

export function executeCalibrationFrameReaction(input: {
  reactionPlan: CalibrationFrameReactionPlan;
  acceptedFrequency: number;
  pushCalibrationFrequency: (frequency: number) => void;
  setCalibrationProgress: (progressPercent: number) => void;
  finishCalibration: () => void;
}) {
  const {
    reactionPlan,
    acceptedFrequency,
    pushCalibrationFrequency,
    setCalibrationProgress,
    finishCalibration,
  } = input;
  if (reactionPlan.kind !== 'accept_sample') return;

  pushCalibrationFrequency(acceptedFrequency);
  setCalibrationProgress(reactionPlan.progressPercent);
  if (reactionPlan.shouldFinishCalibration) {
    finishCalibration();
  }
}

export function executeAudioMonophonicReaction(input: {
  reactionPlan: AudioMonophonicReactionPlan;
  onStableDetectedNote: (detectedNote: string) => void;
}) {
  if (input.reactionPlan.kind !== 'stable_note') return;
  input.onStableDetectedNote(input.reactionPlan.detectedNote);
}
