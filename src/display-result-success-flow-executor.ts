import type { DetectionType } from './modes/training-mode';
import { formatSessionGoalProgress, formatSessionGoalReached } from './session-goal';
import { buildSuccessInfoSlots } from './session-result';
import {
  executeSessionSuccessPlan,
  type SessionSuccessExecutorDeps,
} from './session-success-executor';
import type { SessionPace } from './session-pace';
import { buildSessionSuccessPlan } from './session-success-plan';
import type { Prompt } from './types';

type ResultTone = 'neutral' | 'success' | 'error';

export interface DisplayResultSuccessFlowInput {
  prompt: Prompt;
  trainingMode: string;
  modeDetectionType: DetectionType | null;
  elapsedSeconds: number;
  currentArpeggioIndex: number;
  showingAllNotes: boolean;
  sessionPace: SessionPace;
  goalTargetCorrect: number | null;
  correctAttempts: number | null;
}

export interface DisplayResultSuccessFlowDeps extends SessionSuccessExecutorDeps {
  setInfoSlots: (slot1?: string, slot2?: string, slot3?: string) => void;
  setSessionGoalProgress: (text: string) => void;
  stopListening: () => void;
  setCurrentArpeggioIndex: (index: number) => void;
  setResultMessage: (message: string, tone: ResultTone) => void;
}

export type DisplayResultSuccessFlowOutcome = 'goal_reached' | 'success_plan_executed';

export function executeDisplayResultSuccessFlow(
  input: DisplayResultSuccessFlowInput,
  deps: DisplayResultSuccessFlowDeps
): DisplayResultSuccessFlowOutcome {
  const infoSlots = buildSuccessInfoSlots(input.prompt);
  if (infoSlots.slot1 || infoSlots.slot2 || infoSlots.slot3) {
    deps.setInfoSlots(infoSlots.slot1, infoSlots.slot2, infoSlots.slot3);
  }

  if (input.goalTargetCorrect !== null && input.correctAttempts !== null) {
    deps.setSessionGoalProgress(
      formatSessionGoalProgress(input.correctAttempts, input.goalTargetCorrect)
    );
  }

  if (
    input.trainingMode !== 'timed' &&
    input.goalTargetCorrect !== null &&
    input.correctAttempts !== null &&
    input.correctAttempts >= input.goalTargetCorrect
  ) {
    deps.stopListening();
    deps.setResultMessage(formatSessionGoalReached(input.goalTargetCorrect), 'success');
    return 'goal_reached';
  }

  const successPlan = buildSessionSuccessPlan({
    trainingMode: input.trainingMode,
    detectionType: input.modeDetectionType,
    elapsedSeconds: input.elapsedSeconds,
    currentArpeggioIndex: input.currentArpeggioIndex,
    arpeggioLength: input.prompt.targetChordNotes.length,
    showingAllNotes: input.showingAllNotes,
    sessionPace: input.sessionPace,
  });
  deps.setCurrentArpeggioIndex(successPlan.nextArpeggioIndex);
  executeSessionSuccessPlan({
    successPlan,
    prompt: input.prompt,
    deps,
  });
  return 'success_plan_executed';
}
