import type { DetectionType } from './modes/training-mode';
import { isArpeggioMode, isProgressionMode } from './training-mode-groups';

export interface SessionButtonsStartState {
  startDisabled: boolean;
  stopDisabled: boolean;
  hintDisabled: boolean;
  playSoundDisabled: boolean;
}

export interface SessionStartPlan {
  sessionButtons: SessionButtonsStartState;
  timed: {
    enabled: boolean;
    durationSeconds: number;
    initialScore: number;
  };
  progression: {
    isRequired: boolean;
    isValid: boolean;
    selected: string[];
  };
  resetArpeggioIndex: boolean;
  shouldStart: boolean;
  errorMessage: string | null;
}

export interface SessionStartPlanInput {
  trainingMode: string;
  modeDetectionType: DetectionType | null;
  progressionName: string;
  progressions: Record<string, string[]>;
  timedDuration: number;
}

export function buildSessionStartPlan({
  trainingMode,
  modeDetectionType,
  progressionName,
  progressions,
  timedDuration,
}: SessionStartPlanInput): SessionStartPlan {
  const progressionRequired = isProgressionMode(trainingMode);
  const selectedProgression = progressionRequired ? progressions[progressionName] ?? [] : [];
  const progressionValid =
    !progressionRequired || (progressionName.length > 0 && selectedProgression.length > 0);

  const shouldStart = progressionValid;
  const errorMessage = shouldStart ? null : 'Please select a valid chord progression.';

  return {
    sessionButtons: {
      startDisabled: true,
      stopDisabled: false,
      hintDisabled: modeDetectionType !== 'monophonic',
      playSoundDisabled: true,
    },
    timed: {
      enabled: trainingMode === 'timed',
      durationSeconds: timedDuration,
      initialScore: 0,
    },
    progression: {
      isRequired: progressionRequired,
      isValid: progressionValid,
      selected: selectedProgression,
    },
    resetArpeggioIndex: isArpeggioMode(trainingMode),
    shouldStart,
    errorMessage,
  };
}
