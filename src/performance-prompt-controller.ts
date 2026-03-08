import { buildSuccessInfoSlots } from './session-result';
import { isPerformanceStyleMode } from './training-mode-groups';
import type { Prompt } from './types';
import type { PerformanceTimingGrade } from './performance-timing-grade';

interface PerformancePromptControllerDeps {
  state: {
    currentPrompt: Prompt | null;
    performancePromptResolved: boolean;
    performancePromptMatched: boolean;
    performancePromptHadAttempt: boolean;
    performancePromptHadWrongAttempt: boolean;
    pendingTimeoutIds: Set<number>;
    isListening: boolean;
    showingAllNotes: boolean;
    currentMelodyEventFoundNotes: Set<string>;
    activeSessionStats: unknown;
    currentInstrument: unknown;
  };
  getTrainingMode(): string;
  clearWrongDetectedHighlight(): void;
  recordPerformanceTimelineSuccess(prompt: Prompt, redraw?: boolean): void;
  recordPerformanceTimelineMissed(prompt: Prompt): void;
  recordSessionAttempt(
    activeSessionStats: unknown,
    prompt: Prompt,
    correct: boolean,
    elapsedSeconds: number,
    instrument: unknown
  ): void;
  recordPerformancePromptResolution(
    activeSessionStats: unknown,
    input: { correct: boolean; hadAttempt: boolean; hadWrongAttempt: boolean }
  ): void;
  updateStats(correct: boolean, elapsedSeconds: number): void;
  updateSessionGoalProgress(): void;
  recordPerformanceTimingAttempt(activeSessionStats: unknown, grade: PerformanceTimingGrade | null): void;
  recordPerformanceTimingByEvent(grade: PerformanceTimingGrade | null): void;
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
    deps.state.performancePromptHadAttempt = false;
    deps.state.performancePromptHadWrongAttempt = false;
  }

  function markPromptAttempt() {
    if (
      !isPerformanceStyleMode(deps.getTrainingMode()) ||
      deps.state.performancePromptResolved ||
      !deps.state.currentPrompt
    ) {
      return;
    }
    deps.state.performancePromptHadAttempt = true;
  }

  function recordOutcome(
    correct: boolean,
    elapsedSeconds: number,
    options?: {
      skipVisualUpdate?: boolean;
    }
  ) {
    const prompt = deps.state.currentPrompt;
    if (!prompt) return;

    deps.recordSessionAttempt(
      deps.state.activeSessionStats,
      prompt,
      correct,
      elapsedSeconds,
      deps.state.currentInstrument
    );
    deps.recordPerformancePromptResolution(deps.state.activeSessionStats, {
      correct,
      hadAttempt: deps.state.performancePromptHadAttempt,
      hadWrongAttempt: deps.state.performancePromptHadWrongAttempt,
    });
    deps.updateStats(correct, elapsedSeconds);
    deps.updateSessionGoalProgress();

    if (!correct) return;

    const infoSlots = buildSuccessInfoSlots(prompt);
    if (infoSlots.slot1 || infoSlots.slot2 || infoSlots.slot3) {
      deps.setInfoSlots(infoSlots.slot1, infoSlots.slot2, infoSlots.slot3);
    }

    if (options?.skipVisualUpdate) {
      return;
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

  function resolveSuccess(elapsedSeconds: number, timingGrade: PerformanceTimingGrade | null = null) {
    if (
      !isPerformanceStyleMode(deps.getTrainingMode()) ||
      !deps.state.currentPrompt ||
      deps.state.performancePromptResolved
    ) {
      return;
    }

    deps.clearWrongDetectedHighlight();
    deps.state.performancePromptResolved = true;
    deps.state.performancePromptMatched = true;
    deps.recordPerformanceTimelineSuccess(deps.state.currentPrompt, false);
    deps.recordPerformanceTimingAttempt(deps.state.activeSessionStats, timingGrade);
    deps.recordPerformanceTimingByEvent(timingGrade);
    if (timingGrade) {
      deps.setResultMessage(timingGrade.label, 'success');
    }
    recordOutcome(true, elapsedSeconds, { skipVisualUpdate: true });
  }

  function resolveMissed() {
    if (
      !isPerformanceStyleMode(deps.getTrainingMode()) ||
      !deps.state.currentPrompt ||
      deps.state.performancePromptResolved
    ) {
      return;
    }

    deps.state.performancePromptResolved = true;
    deps.state.performancePromptMatched = false;
    deps.recordPerformanceTimelineMissed(deps.state.currentPrompt);
    recordOutcome(false, 0);
    deps.setResultMessage('Missed event.', 'error');
  }

  function scheduleAdvance(prompt: Prompt) {
    if (!isPerformanceStyleMode(deps.getTrainingMode())) return;

    const durationMs =
      typeof prompt.melodyEventDurationMs === 'number' && Number.isFinite(prompt.melodyEventDurationMs)
        ? Math.max(1, Math.round(prompt.melodyEventDurationMs))
        : 700;
    const promptRunToken = ++runToken;

    resetPromptResolution();

    deps.scheduleSessionTimeout(
      durationMs,
      () => {
        if (!deps.state.isListening || !isPerformanceStyleMode(deps.getTrainingMode())) return;
        if (promptRunToken !== runToken) return;
        if (deps.state.currentPrompt !== prompt) return;
        if (deps.state.performancePromptResolved) {
          deps.nextPrompt();
          return;
        }

        deps.state.performancePromptResolved = true;
        deps.state.performancePromptMatched = false;
        deps.recordPerformanceTimelineMissed(prompt);
        recordOutcome(false, 0);
        deps.setResultMessage('Missed event.', 'error');
        deps.nextPrompt();
      },
      'performance nextPrompt'
    );
  }

  return {
    invalidatePendingAdvance,
    markPromptAttempt,
    resetPromptResolution,
    resolveMissed,
    resolveSuccess,
    scheduleAdvance,
  };
}
