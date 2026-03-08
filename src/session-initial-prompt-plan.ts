export const PERFORMANCE_SESSION_PREROLL_MS = 2000;
export const PERFORMANCE_SESSION_PREROLL_STEPS = 4;

export interface SessionInitialPromptPlan {
  delayMs: number;
  prepMessage: string;
  pulseCount: number;
}

export function buildSessionInitialPromptPlan(trainingMode: string): SessionInitialPromptPlan {
  if (trainingMode === 'performance' || trainingMode === 'practice') {
    return {
      delayMs: PERFORMANCE_SESSION_PREROLL_MS,
      prepMessage: 'Get ready...',
      pulseCount: PERFORMANCE_SESSION_PREROLL_STEPS,
    };
  }

  return {
    delayMs: 0,
    prepMessage: '',
    pulseCount: 0,
  };
}
