import type { DetectionType } from './modes/training-mode';
import { calculateTimedPoints } from './session-result';
import { getArpeggioCompleteDelayMs, getStandardSuccessDelayMs, type SessionPace } from './session-pace';
import { isArpeggioMode } from './training-mode-groups';

export type SessionSuccessPlanKind =
  | 'arpeggio_continue'
  | 'arpeggio_complete'
  | 'timed'
  | 'standard';

export interface SessionSuccessPlanInput {
  trainingMode: string;
  detectionType: DetectionType | null;
  elapsedSeconds: number;
  currentArpeggioIndex: number;
  arpeggioLength: number;
  showingAllNotes: boolean;
  sessionPace: SessionPace;
}

export interface SessionSuccessPlan {
  kind: SessionSuccessPlanKind;
  nextArpeggioIndex: number;
  scoreDelta: number;
  message: string;
  delayMs: number;
  hideTuner: boolean;
  drawSolvedFretboard: boolean;
  drawSolvedAsPolyphonic: boolean;
  usesCooldownDelay: boolean;
}

export function buildSessionSuccessPlan({
  trainingMode,
  detectionType,
  elapsedSeconds,
  currentArpeggioIndex,
  arpeggioLength,
  showingAllNotes,
  sessionPace,
}: SessionSuccessPlanInput): SessionSuccessPlan {
  if (isArpeggioMode(trainingMode)) {
    const nextArpeggioIndex = currentArpeggioIndex + 1;
    if (nextArpeggioIndex >= arpeggioLength) {
      return {
        kind: 'arpeggio_complete',
        nextArpeggioIndex: 0,
        scoreDelta: 0,
        message: 'Arpeggio Complete!',
        delayMs: getArpeggioCompleteDelayMs(sessionPace),
        hideTuner: false,
        drawSolvedFretboard: false,
        drawSolvedAsPolyphonic: false,
        usesCooldownDelay: true,
      };
    }

    return {
      kind: 'arpeggio_continue',
      nextArpeggioIndex,
      scoreDelta: 0,
      message: '',
      delayMs: 0,
      hideTuner: false,
      drawSolvedFretboard: false,
      drawSolvedAsPolyphonic: false,
      usesCooldownDelay: false,
    };
  }

  if (trainingMode === 'timed') {
    const scoreDelta = calculateTimedPoints(elapsedSeconds);
    return {
      kind: 'timed',
      nextArpeggioIndex: currentArpeggioIndex,
      scoreDelta,
      message: `+${scoreDelta}`,
      delayMs: 200,
      hideTuner: false,
      drawSolvedFretboard: false,
      drawSolvedAsPolyphonic: false,
      usesCooldownDelay: false,
    };
  }

  return {
    kind: 'standard',
    nextArpeggioIndex: currentArpeggioIndex,
    scoreDelta: 0,
    message: `Correct! Time: ${elapsedSeconds.toFixed(2)}s`,
    delayMs: getStandardSuccessDelayMs(sessionPace),
    hideTuner: true,
    drawSolvedFretboard: !showingAllNotes,
    drawSolvedAsPolyphonic: detectionType === 'polyphonic',
    usesCooldownDelay: true,
  };
}
