import type { Prompt } from './types';

interface MelodyPolyphonicFeedbackControllerDeps {
  state: {
    currentMelodyEventFoundNotes: Set<string>;
    activeSessionStats: unknown;
    currentInstrument: unknown;
    showingAllNotes: boolean;
  };
  recordSessionAttempt(
    activeSessionStats: unknown,
    prompt: Prompt,
    correct: boolean,
    elapsedSeconds: number,
    instrument: unknown
  ): void;
  redrawFretboard(): void;
  drawFretboard(
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: Prompt['targetChordFingering'],
    activeNotes?: Set<string>
  ): void;
  setResultMessage(message: string, tone?: 'neutral' | 'success' | 'error'): void;
  scheduleSessionCooldown(context: string, delayMs: number, callback: () => void): void;
}

export function createMelodyPolyphonicFeedbackController(
  deps: MelodyPolyphonicFeedbackControllerDeps
) {
  function handleMismatch(prompt: Prompt, detectedText: string, context: string) {
    deps.state.currentMelodyEventFoundNotes.clear();
    deps.redrawFretboard();
    deps.recordSessionAttempt(deps.state.activeSessionStats, prompt, false, 0, deps.state.currentInstrument);
    deps.setResultMessage(`Heard: ${detectedText} [wrong]`, 'error');
    if (deps.state.showingAllNotes) return;

    const fingering = prompt.targetMelodyEventNotes ?? prompt.targetChordFingering;
    deps.drawFretboard(false, null, null, fingering, new Set());
    deps.scheduleSessionCooldown(context, 1200, () => {
      deps.redrawFretboard();
    });
  }

  return {
    handleMismatch,
  };
}
