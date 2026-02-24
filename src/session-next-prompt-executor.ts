import type { Prompt } from './types';
import type { SessionNextPromptPlan } from './session-next-prompt-plan';

export interface SessionNextPromptExecutorDeps {
  stopListening: () => void;
  showError: (message: string) => void;
  updateTuner: (frequency: number | null) => void;
  setTunerVisible: (isVisible: boolean) => void;
  applyPrompt: (prompt: Prompt) => void;
}

export type SessionNextPromptExecutionResult = 'stopped' | 'no_prompt' | 'prompt_applied';

export function executeSessionNextPromptPlan(
  nextPromptPlan: SessionNextPromptPlan,
  prompt: Prompt | null,
  deps: SessionNextPromptExecutorDeps
): SessionNextPromptExecutionResult {
  if (nextPromptPlan.shouldStopListening) {
    const errorMessage = nextPromptPlan.errorMessage;
    deps.stopListening();
    if (errorMessage) {
      deps.showError(errorMessage);
    }
    return 'stopped';
  }

  if (nextPromptPlan.errorMessage) {
    deps.showError(nextPromptPlan.errorMessage);
  }
  if (nextPromptPlan.shouldResetTuner) {
    deps.updateTuner(null);
  }

  deps.setTunerVisible(nextPromptPlan.tunerVisible);

  if (!prompt) {
    return 'no_prompt';
  }

  deps.applyPrompt(prompt);
  return 'prompt_applied';
}
