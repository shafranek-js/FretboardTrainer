import { buildSuccessInfoSlots } from './session-result';
import type { Prompt } from './types';

interface PerformancePromptControllerDeps {
  state: {
    currentPrompt: Prompt | null;
    performancePromptResolved: boolean;
    performancePromptMatched: boolean;
    pendingTimeoutIds: Set<number>;
    isListening: boolean;
    showingAllNotes: boolean;
    currentMelodyEventFoundNotes: Set<string>;
    activeSessionStats: unknown;
    currentInstrument: unknown;
  };
  getTrainingMode(): string;
  clearWrongDetectedHighlight(): void;
  recordSessionAttempt(
    activeSessionStats: unknown,
    prompt: Prompt,
    correct: boolean,
    elapsedSeconds: number,
    instrument: unknown
  ): void;
  updateStats(correct: boolean, elapsedSeconds: number): void;
  updateSessionGoalProgress(): void;
  setInfoSlots(slot1?: string, slot2?: string, slot3?: string): void;
  redrawFretboard(): void;
  drawFretboard(
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: Prompt['targetChordFingering'],
    activeNotes?: Set<string>
  ): void;
  setResultMessage(message: string, tone?: 'neutral' | 'success' | 'error'): void;
  scheduleSessionTimeout(delayMs: number, callback: () => void, context: string): number;
  nextPrompt(): void;
}

export function createPerformancePromptController(deps: PerformancePromptControllerDeps) {
  let runToken = 0;

  function invalidatePendingAdvance() {
    runToken += 1;
  }

  function resetPromptResolution() {
    deps.state.performancePromptResolved = false;
    deps.state.performancePromptMatched = false;
  }

  function recordOutcome(correct: boolean, elapsedSeconds: number) {
    const prompt = deps.state.currentPrompt;
    if (!prompt) return;

    deps.recordSessionAttempt(
      deps.state.activeSessionStats,
      prompt,
      correct,
      elapsedSeconds,
      deps.state.currentInstrument
    );
    deps.updateStats(correct, elapsedSeconds);
    deps.updateSessionGoalProgress();

    if (!correct) return;

    const infoSlots = buildSuccessInfoSlots(prompt);
    if (infoSlots.slot1 || infoSlots.slot2 || infoSlots.slot3) {
      deps.setInfoSlots(infoSlots.slot1, infoSlots.slot2, infoSlots.slot3);
    }

    if (deps.state.showingAllNotes) {
      deps.redrawFretboard();
      return;
    }

    const melodyFingering = prompt.targetMelodyEventNotes ?? [];
    if (melodyFingering.length > 0) {
      deps.drawFretboard(false, null, null, melodyFingering, new Set(melodyFingering.map((note) => note.note)));
      return;
    }

    if (prompt.targetChordNotes.length > 0) {
      deps.drawFretboard(false, null, null, prompt.targetChordFingering, new Set(prompt.targetChordNotes));
      return;
    }

    deps.drawFretboard(false, prompt.targetNote, prompt.targetString);
  }

  function resolveSuccess(elapsedSeconds: number) {
    if (deps.getTrainingMode() !== 'performance' || !deps.state.currentPrompt || deps.state.performancePromptResolved) {
      return;
    }

    deps.clearWrongDetectedHighlight();
    deps.state.performancePromptResolved = true;
    deps.state.performancePromptMatched = true;
    recordOutcome(true, elapsedSeconds);
    deps.setResultMessage(`Hit: ${elapsedSeconds.toFixed(2)}s`, 'success');
  }

  function scheduleAdvance(prompt: Prompt) {
    if (deps.getTrainingMode() !== 'performance') return;

    const durationMs =
      typeof prompt.melodyEventDurationMs === 'number' && Number.isFinite(prompt.melodyEventDurationMs)
        ? Math.max(1, Math.round(prompt.melodyEventDurationMs))
        : 700;
    const promptRunToken = ++runToken;

    resetPromptResolution();

    deps.scheduleSessionTimeout(
      durationMs,
      () => {
        if (!deps.state.isListening || deps.getTrainingMode() !== 'performance') return;
        if (promptRunToken !== runToken) return;
        if (deps.state.currentPrompt !== prompt) return;

        if (!deps.state.performancePromptResolved) {
          deps.state.performancePromptResolved = true;
          deps.state.performancePromptMatched = false;
          recordOutcome(false, 0);
          deps.setResultMessage('Missed event.', 'error');
          deps.redrawFretboard();
        }

        deps.nextPrompt();
      },
      'performance nextPrompt'
    );
  }

  return {
    invalidatePendingAdvance,
    resetPromptResolution,
    resolveSuccess,
    scheduleAdvance,
  };
}
