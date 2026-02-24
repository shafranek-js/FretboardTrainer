import type { Prompt } from './types';
import type { SessionSuccessPlan } from './session-success-plan';

type ResultTone = 'neutral' | 'success' | 'error';

export interface SessionSuccessExecutorDeps {
  setResultMessage: (message: string, tone: ResultTone) => void;
  setScoreValue: (score: number) => void;
  setTunerVisible: (isVisible: boolean) => void;
  redrawFretboard: () => void;
  drawFretboard: (
    showAll: boolean,
    rootNote?: string | null,
    rootString?: string | null,
    chordFingering?: Prompt['targetChordFingering'],
    foundChordNotes?: Set<string>
  ) => void;
  scheduleSessionTimeout: (delayMs: number, callback: () => void, context: string) => void;
  scheduleSessionCooldown: (context: string, delayMs: number, callback: () => void) => void;
  nextPrompt: () => void;
  addScore: (delta: number) => number;
}

export interface ExecuteSessionSuccessPlanInput {
  successPlan: SessionSuccessPlan;
  prompt: Pick<Prompt, 'targetNote' | 'targetString' | 'targetChordFingering' | 'targetChordNotes'>;
  deps: SessionSuccessExecutorDeps;
}

export function executeSessionSuccessPlan({
  successPlan,
  prompt,
  deps,
}: ExecuteSessionSuccessPlanInput) {
  if (successPlan.kind === 'arpeggio_continue') {
    deps.redrawFretboard();
    deps.nextPrompt();
    return;
  }

  if (successPlan.kind === 'arpeggio_complete') {
    deps.redrawFretboard();
    deps.setResultMessage(successPlan.message, 'success');
    deps.scheduleSessionCooldown('arpeggio complete nextPrompt', successPlan.delayMs, () => {
      deps.nextPrompt();
    });
    return;
  }

  if (successPlan.kind === 'timed') {
    const nextScore = deps.addScore(successPlan.scoreDelta);
    deps.setScoreValue(nextScore);
    deps.setResultMessage(successPlan.message, 'success');
    deps.scheduleSessionTimeout(
      successPlan.delayMs,
      () => {
        deps.nextPrompt();
      },
      'timed nextPrompt'
    );
    return;
  }

  deps.setResultMessage(successPlan.message, 'success');
  if (successPlan.hideTuner) {
    deps.setTunerVisible(false);
  }

  if (successPlan.drawSolvedFretboard) {
    if (successPlan.drawSolvedAsPolyphonic) {
      deps.drawFretboard(false, null, null, prompt.targetChordFingering, new Set(prompt.targetChordNotes));
    } else {
      deps.drawFretboard(false, prompt.targetNote, prompt.targetString);
    }
  }

  if (successPlan.usesCooldownDelay) {
    deps.scheduleSessionCooldown('standard cooldown nextPrompt', successPlan.delayMs, () => {
      deps.nextPrompt();
    });
    return;
  }

  deps.scheduleSessionTimeout(
    successPlan.delayMs,
    () => {
      deps.nextPrompt();
    },
    'standard nextPrompt'
  );
}
