import type { SessionTimeUpPlan } from './session-timeup-plan';

type ResultTone = 'neutral' | 'success' | 'error';

export interface SessionTimeUpExecutorDeps {
  clearTimer: () => void;
  persistHighScore: (nextHighScore: number) => void;
  requestSessionSummaryOnStop: () => void;
  stopListening: () => void;
  setResultMessage: (message: string, tone?: ResultTone) => void;
}

export function executeSessionTimeUpPlan(
  timeUpPlan: SessionTimeUpPlan,
  deps: SessionTimeUpExecutorDeps
) {
  deps.clearTimer();
  if (timeUpPlan.shouldPersistHighScore) {
    deps.persistHighScore(timeUpPlan.nextHighScore);
  }
  deps.requestSessionSummaryOnStop();
  deps.stopListening();
  deps.setResultMessage(timeUpPlan.message);
}
