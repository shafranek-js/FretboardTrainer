import { buildStableMonophonicReactionPlan } from './session-detection-reactions';
import { isMelodyWorkflowMode } from './training-mode-groups';
import type { Prompt } from './types';
import { shouldForgivePerformanceTimingBoundaryAttempt } from './performance-timing-forgiveness';
import { shouldJudgePerformanceMicOnset } from './performance-mic-onset-gate';
import { resolveLatencyCompensatedPromptStartedAtMs } from './performance-mic-latency-compensation';

type ResultTone = 'neutral' | 'success' | 'error';

interface OctaveMismatch {
  detectedScientific: string;
  targetScientific: string;
}

interface StableMonophonicDetectionControllerDeps {
  state: {
    currentPrompt: Prompt | null;
    currentMelodyEventFoundNotes: Set<string>;
    performancePromptResolved: boolean;
    performanceTimingLeniencyPreset?: 'strict' | 'normal' | 'forgiving';
    performanceMicLatencyCompensationMs?: number;
    startTime: number;
    micMonophonicFirstDetectedAtMs: number | null;
    performanceMicLastJudgedOnsetNote: string | null;
    performanceMicLastJudgedOnsetAtMs: number | null;
    showingAllNotes: boolean;
    wrongDetectedNote: string | null;
    wrongDetectedString: string | null;
    wrongDetectedFret: number | null;
    activeSessionStats: unknown;
    currentInstrument: unknown;
  };
  getTrainingMode(): string;
  clearWrongDetectedHighlight(): void;
  setWrongDetectedHighlight(detectedNote: string, detectedFrequency?: number | null): void;
  recordPerformanceTimelineWrongAttempt(detectedNote: string): void;
  markPerformancePromptAttempt(): void;
  markPerformanceMicOnsetJudged(detectedNote: string, onsetAtMs: number): void;
  recordPerformanceMicJudgmentLatency(onsetAtMs: number, judgedAtMs: number): void;
  isPerformancePitchWithinTolerance(detectedFrequency?: number | null): boolean;
  detectMonophonicOctaveMismatch(
    detectedNote: string,
    detectedFrequency?: number | null
  ): OctaveMismatch | null;
  performanceResolveSuccess(elapsedSeconds: number): void;
  handleMelodyPolyphonicMismatch(prompt: Prompt, detectedText: string, context: string): void;
  displayResult(correct: boolean, elapsedSeconds: number): void;
  setResultMessage(message: string, tone?: ResultTone): void;
  redrawFretboard(): void;
  drawFretboard(
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: Prompt['targetChordFingering'],
    activeNotes?: Set<string>,
    hintNote?: string | null,
    wrongDetectedNote?: string | null,
    wrongDetectedString?: string | null,
    wrongDetectedFret?: number | null
  ): void;
  scheduleSessionCooldown(context: string, delayMs: number, callback: () => void): void;
  recordSessionAttempt(
    activeSessionStats: unknown,
    prompt: Prompt,
    correct: boolean,
    elapsedSeconds: number,
    instrument: unknown
  ): void;
  handleRhythmModeStableNote(detectedNote: string): void;
  updateFreePlayLiveHighlight(detectedNote: string): void;
  freqToScientificNoteName(frequency: number): string;
}

function isPolyphonicMelodyPrompt(
  prompt: Prompt | null
): prompt is Prompt & { targetMelodyEventNotes: NonNullable<Prompt['targetMelodyEventNotes']> } {
  return Boolean(prompt && (prompt.targetMelodyEventNotes?.length ?? 0) > 1);
}

function getPolyphonicMelodyTargetPitchClasses(prompt: Prompt) {
  if (prompt.targetChordNotes.length > 0) return [...new Set(prompt.targetChordNotes)];
  return [...new Set((prompt.targetMelodyEventNotes ?? []).map((note) => note.note))];
}

export function createStableMonophonicDetectionController(
  deps: StableMonophonicDetectionControllerDeps
) {
  function handleDetectedNote(detectedNote: string, detectedFrequency?: number | null) {
    const trainingMode = deps.getTrainingMode();
    const prompt = deps.state.currentPrompt;
    const nowMs = Date.now();
    const compensatedPromptStartedAtMs =
      deps.getTrainingMode() === 'performance'
        ? resolveLatencyCompensatedPromptStartedAtMs(
            deps.state.startTime,
            deps.state.performanceMicLatencyCompensationMs ?? 0
          )
        : deps.state.startTime;
    const shouldForgivePerformanceTiming = shouldForgivePerformanceTimingBoundaryAttempt({
      prompt,
      promptStartedAtMs: compensatedPromptStartedAtMs,
      nowMs,
      preset: deps.state.performanceTimingLeniencyPreset ?? 'normal',
    });

    if (isMelodyWorkflowMode(trainingMode) && prompt && isPolyphonicMelodyPrompt(prompt)) {
      const targetPitchClasses = getPolyphonicMelodyTargetPitchClasses(prompt);
      if (trainingMode === 'performance' && deps.state.performancePromptResolved) {
        return;
      }
      if (trainingMode === 'performance') {
        deps.markPerformancePromptAttempt();
      }
      if (!targetPitchClasses.includes(detectedNote)) {
        if (trainingMode === 'performance') {
          if (shouldForgivePerformanceTiming) {
            return;
          }
          deps.setResultMessage(`Heard: ${detectedNote} [off target]`, 'error');
          return;
        }
        deps.handleMelodyPolyphonicMismatch(prompt, detectedNote, 'melody polyphonic mismatch redraw');
        return;
      }

      const wasAlreadyFound = deps.state.currentMelodyEventFoundNotes.has(detectedNote);
      deps.state.currentMelodyEventFoundNotes.add(detectedNote);
      deps.redrawFretboard();

      const foundCount = deps.state.currentMelodyEventFoundNotes.size;
      if (foundCount < targetPitchClasses.length) {
        if (!wasAlreadyFound) {
          deps.setResultMessage(
            `Heard: ${detectedNote} [${foundCount}/${targetPitchClasses.length}] (mic poly mode: play remaining notes one by one)`
          );
        }
        return;
      }

      const elapsed = (Date.now() - deps.state.startTime) / 1000;
      if (trainingMode === 'performance') {
        deps.performanceResolveSuccess(elapsed);
      } else {
        deps.displayResult(true, elapsed);
      }
      return;
    }

    if (trainingMode === 'performance') {
      if (deps.state.performancePromptResolved || !prompt) return;
      const onsetAtMs = deps.state.micMonophonicFirstDetectedAtMs;
      if (
        !shouldJudgePerformanceMicOnset({
          detectedNote,
          noteFirstDetectedAtMs: onsetAtMs,
          promptStartedAtMs: compensatedPromptStartedAtMs ?? deps.state.startTime,
          nowMs,
          lastJudgedOnsetNote: deps.state.performanceMicLastJudgedOnsetNote,
          lastJudgedOnsetAtMs: deps.state.performanceMicLastJudgedOnsetAtMs,
        })
      ) {
        return;
      }
      deps.markPerformancePromptAttempt();

      if (deps.isPerformancePitchWithinTolerance(detectedFrequency)) {
        deps.markPerformanceMicOnsetJudged(detectedNote, onsetAtMs ?? nowMs);
        deps.recordPerformanceMicJudgmentLatency(onsetAtMs ?? nowMs, nowMs);
        const elapsed = (nowMs - deps.state.startTime) / 1000;
        deps.performanceResolveSuccess(elapsed);
        return;
      }

      const octaveMismatch = deps.detectMonophonicOctaveMismatch(detectedNote, detectedFrequency);
      if (octaveMismatch) {
        if (shouldForgivePerformanceTiming) {
          return;
        }
        deps.setResultMessage(
          `Heard: ${octaveMismatch.detectedScientific} [wrong octave, expected ${octaveMismatch.targetScientific}]`,
          'error'
        );
        deps.setWrongDetectedHighlight(detectedNote, detectedFrequency);
        deps.markPerformanceMicOnsetJudged(detectedNote, onsetAtMs ?? nowMs);
        deps.recordPerformanceMicJudgmentLatency(onsetAtMs ?? nowMs, nowMs);
        deps.recordPerformanceTimelineWrongAttempt(detectedNote);
        return;
      }

      if (prompt.targetNote && detectedNote === prompt.targetNote) {
        deps.markPerformanceMicOnsetJudged(detectedNote, onsetAtMs ?? nowMs);
        deps.recordPerformanceMicJudgmentLatency(onsetAtMs ?? nowMs, nowMs);
        const elapsed = (nowMs - deps.state.startTime) / 1000;
        deps.performanceResolveSuccess(elapsed);
        return;
      }

      if (shouldForgivePerformanceTiming) {
        return;
      }

      const detectedScientific =
        typeof detectedFrequency === 'number' && detectedFrequency > 0
          ? deps.freqToScientificNoteName(detectedFrequency)
          : null;
      deps.setResultMessage(`Heard: ${detectedScientific ?? detectedNote} [off target]`, 'error');
      deps.setWrongDetectedHighlight(detectedNote, detectedFrequency);
      deps.markPerformanceMicOnsetJudged(detectedNote, onsetAtMs ?? nowMs);
      deps.recordPerformanceMicJudgmentLatency(onsetAtMs ?? nowMs, nowMs);
      deps.recordPerformanceTimelineWrongAttempt(detectedNote);
      return;
    }

    const reactionPlan = buildStableMonophonicReactionPlan({
      trainingMode,
      detectedNote,
      hasCurrentPrompt: Boolean(prompt),
      promptTargetNote: prompt?.targetNote ?? null,
      promptTargetString: prompt?.targetString ?? null,
      showingAllNotes: deps.state.showingAllNotes,
    });

    if (reactionPlan.kind === 'free_highlight') {
      deps.clearWrongDetectedHighlight();
      deps.updateFreePlayLiveHighlight(detectedNote);
      return;
    }

    if (reactionPlan.kind === 'rhythm_feedback') {
      deps.clearWrongDetectedHighlight();
      deps.handleRhythmModeStableNote(detectedNote);
      return;
    }

    const octaveMismatch = deps.detectMonophonicOctaveMismatch(detectedNote, detectedFrequency);
    if (octaveMismatch && prompt) {
      deps.recordSessionAttempt(deps.state.activeSessionStats, prompt, false, 0, deps.state.currentInstrument);
      deps.setResultMessage(
        `Heard: ${octaveMismatch.detectedScientific} [wrong octave, expected ${octaveMismatch.targetScientific}]`,
        'error'
      );
      deps.setWrongDetectedHighlight(detectedNote, detectedFrequency);
      if (!deps.state.showingAllNotes && prompt.targetNote) {
        deps.drawFretboard(
          false,
          prompt.targetNote,
          prompt.targetString,
          [],
          new Set(),
          null,
          deps.state.wrongDetectedNote,
          deps.state.wrongDetectedString,
          deps.state.wrongDetectedFret
        );
        deps.scheduleSessionCooldown('monophonic octave mismatch redraw', 1500, () => {
          deps.clearWrongDetectedHighlight();
          deps.redrawFretboard();
        });
        return;
      }

      deps.redrawFretboard();
      deps.scheduleSessionCooldown('monophonic octave mismatch clear wrong highlight', 1500, () => {
        deps.clearWrongDetectedHighlight();
        deps.redrawFretboard();
      });
      return;
    }

    if (reactionPlan.kind === 'success') {
      deps.clearWrongDetectedHighlight();
      const elapsed = (Date.now() - deps.state.startTime) / 1000;
      deps.displayResult(true, elapsed);
      return;
    }

    if (reactionPlan.kind === 'ignore_no_prompt' || !prompt) return;

    deps.recordSessionAttempt(deps.state.activeSessionStats, prompt, false, 0, deps.state.currentInstrument);
    const detectedScientific =
      typeof detectedFrequency === 'number' && detectedFrequency > 0
        ? deps.freqToScientificNoteName(detectedFrequency)
        : null;
    deps.setResultMessage(`Heard: ${detectedScientific ?? detectedNote} [wrong]`, 'error');
    deps.setWrongDetectedHighlight(detectedNote, detectedFrequency);
    if (reactionPlan.shouldDrawTargetFretboard) {
      deps.drawFretboard(
        false,
        reactionPlan.targetNote,
        reactionPlan.targetString,
        [],
        new Set(),
        null,
        deps.state.wrongDetectedNote,
        deps.state.wrongDetectedString,
        deps.state.wrongDetectedFret
      );
      deps.scheduleSessionCooldown('monophonic mismatch redraw', reactionPlan.cooldownDelayMs, () => {
        deps.clearWrongDetectedHighlight();
        deps.redrawFretboard();
      });
      return;
    }

    deps.redrawFretboard();
    deps.scheduleSessionCooldown(
      'monophonic mismatch clear wrong highlight',
      reactionPlan.cooldownDelayMs,
      () => {
        deps.clearWrongDetectedHighlight();
        deps.redrawFretboard();
      }
    );
  }

  return {
    handleDetectedNote,
  };
}
