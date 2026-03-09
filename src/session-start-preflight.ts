import type { IInstrument } from './instruments/instrument';
import { getMelodyById } from './melody-library';
import { getMelodyWithPracticeAdjustments } from './melody-string-shift';
import type { DetectionType } from './modes/training-mode';
import { isArpeggioMode, isMelodyWorkflowMode, isProgressionMode } from './training-mode-groups';

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
  selectedMelodyId?: string | null;
  currentInstrument?: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'> | null;
  melodyTransposeSemitones?: number;
  melodyStringShift?: number;
}

function resolveMelodyStartErrorMessage(trainingMode: string) {
  if (trainingMode === 'melody') {
    return 'Select a melody to practice.';
  }
  return 'Select a melody to perform.';
}

export function buildSessionStartPlan({
  trainingMode,
  modeDetectionType,
  progressionName,
  progressions,
  timedDuration,
  selectedMelodyId = null,
  currentInstrument = null,
  melodyTransposeSemitones = 0,
  melodyStringShift = 0,
}: SessionStartPlanInput): SessionStartPlan {
  const progressionRequired = isProgressionMode(trainingMode);
  const selectedProgression = progressionRequired ? progressions[progressionName] ?? [] : [];
  const progressionValid =
    !progressionRequired || (progressionName.length > 0 && selectedProgression.length > 0);

  let shouldStart = progressionValid;
  let errorMessage = shouldStart ? null : 'Please select a valid chord progression.';

  if (shouldStart && isMelodyWorkflowMode(trainingMode)) {
    if (!selectedMelodyId) {
      shouldStart = false;
      errorMessage = resolveMelodyStartErrorMessage(trainingMode);
    } else if (!currentInstrument) {
      shouldStart = false;
      errorMessage =
        'Selected melody is not available for the current instrument. Choose another melody or re-import the tab.';
    } else {
      const baseMelody = getMelodyById(selectedMelodyId, currentInstrument);
      if (!baseMelody) {
        shouldStart = false;
        errorMessage =
          'Selected melody is not available for the current instrument. Choose another melody or re-import the tab.';
      } else {
        const adjustedMelody = getMelodyWithPracticeAdjustments(
          baseMelody,
          melodyTransposeSemitones,
          melodyStringShift,
          currentInstrument
        );
        if (adjustedMelody.events.length === 0) {
          shouldStart = false;
          errorMessage = 'Selected melody has no playable notes.';
        }
      }
    }
  }

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
