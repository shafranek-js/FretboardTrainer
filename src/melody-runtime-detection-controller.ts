import type { MidiNoteEvent } from './midi-runtime';
import { formatDetectedMidiChordNotes, areMidiHeldNotesMatchingTargetChord } from './midi-chord-evaluation';
import type { Prompt } from './types';
import {
  buildLowConfidenceMicPolyphonicMessage,
  isLowConfidenceMicPolyphonicResult,
} from './mic-polyphonic-low-confidence';
import { shouldForgivePerformanceTimingBoundaryAttempt } from './performance-timing-forgiveness';
import {
  normalizePerformanceMicLatencyCompensationMs,
  resolveLatencyCompensatedPromptStartedAtMs,
} from './performance-mic-latency-compensation';
import { evaluatePerformanceTimingGrade, type PerformanceTimingGrade } from './performance-timing-grade';
import { isPerformanceStyleMode } from './training-mode-groups';
import { getMelodyPromptPitchClasses, isPolyphonicMelodyPrompt } from './melody-prompt-polyphony';

interface MicPolyphonicResult {
  detectedNotesText: string;
  detectedNoteNames: string[];
  nextStableChordCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
  fallbackFrom?: string | null;
  warnings?: string[];
}

interface MelodyRuntimeDetectionControllerDeps {
  state: {
    currentPrompt: Prompt | null;
    analyser: {
      fftSize: number;
      getFloatFrequencyData(target: Float32Array): void;
    } | null;
    audioContext: { sampleRate: number } | null;
    frequencyDataArray: Float32Array | null;
    dataArray: Float32Array | null;
    calibratedA4: number;
    lastDetectedChord: string;
    stableChordCounter: number;
    currentMelodyEventFoundNotes: Set<string>;
    performancePromptResolved: boolean;
    performanceTimingLeniencyPreset?: 'strict' | 'normal' | 'forgiving';
    performanceMicLatencyCompensationMs?: number;
    performanceTimingBiasMs?: number;
    inputSource?: 'microphone' | 'midi';
    startTime: number;
    micPolyphonicDetectorProvider: string;
  };
  requiredStableFrames: number;
  getTrainingMode(): string;
  detectMicPolyphonicFrame(input: {
    spectrum: Float32Array;
    timeDomainData?: Float32Array;
    frameVolumeRms: number;
    timestampMs: number;
    sampleRate: number;
    fftSize: number;
    calibratedA4: number;
    lastDetectedChord: string;
    stableChordCounter: number;
    requiredStableFrames: number;
    targetChordNotes: string[];
    provider: string;
  }): MicPolyphonicResult;
  updateMicPolyphonicDetectorRuntimeStatus(result: MicPolyphonicResult, latencyMs: number): void;
  now(): number;
  performanceNow(): number;
  redrawFretboard(): void;
  setResultMessage(message: string, tone?: 'neutral' | 'success' | 'error'): void;
  recordPerformanceTimelineWrongAttempt(detectedNote: string): void;
  markPerformancePromptAttempt(): void;
  performanceResolveSuccess(elapsedSeconds: number, timingGrade?: PerformanceTimingGrade | null): void;
  displayResult(correct: boolean, elapsedSeconds: number): void;
  handleMelodyPolyphonicMismatch(prompt: Prompt, detectedText: string, context: string): void;
  handleStableMonophonicDetectedNote(detectedNote: string): void;
}

function getPolyphonicMelodyTargetPitchClasses(prompt: Prompt) {
  return getMelodyPromptPitchClasses(prompt);
}


function setsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function createMelodyRuntimeDetectionController(deps: MelodyRuntimeDetectionControllerDeps) {
  let lastLowConfidenceMessageAtMs = 0;

  function resolvePerformanceTimingGrade(nowMs: number) {
    const latencyCompensationMs =
      deps.state.inputSource === 'microphone'
        ? normalizePerformanceMicLatencyCompensationMs(
            deps.state.performanceMicLatencyCompensationMs ?? 0
          )
        : 0;
    const timingBiasMs =
      deps.state.inputSource === 'microphone'
        ? Math.round(deps.state.performanceTimingBiasMs ?? 0)
        : 0;
    const referenceStartedAtMs = deps.state.startTime;
    const judgedAtMs = nowMs - latencyCompensationMs;
    return evaluatePerformanceTimingGrade({
      signedOffsetMs: judgedAtMs - referenceStartedAtMs - timingBiasMs,
      preset: deps.state.performanceTimingLeniencyPreset ?? 'normal',
      eventDurationMs: deps.state.currentPrompt?.melodyEventDurationMs,
      inputSource: deps.state.inputSource,
    });
  }

  function handleMicrophonePolyphonicMelodyFrame(frameVolumeRms: number) {
    const prompt = deps.state.currentPrompt;
    if (
      !isPolyphonicMelodyPrompt(prompt) ||
      !deps.state.analyser ||
      !deps.state.audioContext ||
      !deps.state.frequencyDataArray
    ) {
      return false;
    }
    const trainingMode = deps.getTrainingMode();

    deps.state.analyser.getFloatFrequencyData(deps.state.frequencyDataArray);
    const targetPitchClasses = getPolyphonicMelodyTargetPitchClasses(prompt);
    const startedAt = deps.performanceNow();
    const polyphonicResult = deps.detectMicPolyphonicFrame({
      spectrum: deps.state.frequencyDataArray,
      timeDomainData: deps.state.dataArray ?? undefined,
      frameVolumeRms,
      timestampMs: deps.now(),
      sampleRate: deps.state.audioContext.sampleRate,
      fftSize: deps.state.analyser.fftSize,
      calibratedA4: deps.state.calibratedA4,
      lastDetectedChord: deps.state.lastDetectedChord,
      stableChordCounter: deps.state.stableChordCounter,
      requiredStableFrames: deps.requiredStableFrames,
      targetChordNotes: targetPitchClasses,
      provider: deps.state.micPolyphonicDetectorProvider,
    });
    deps.state.lastDetectedChord = polyphonicResult.detectedNotesText;
    deps.state.stableChordCounter = polyphonicResult.nextStableChordCounter;
    deps.updateMicPolyphonicDetectorRuntimeStatus(
      polyphonicResult,
      deps.performanceNow() - startedAt
    );

    const detectedNotes = polyphonicResult.detectedNoteNames;
    const shouldUseLowConfidenceFallback =
      isLowConfidenceMicPolyphonicResult(polyphonicResult) &&
      !polyphonicResult.isStableMatch &&
      (detectedNotes.length > 0 || polyphonicResult.isStableMismatch);

    if (
      isPerformanceStyleMode(trainingMode) &&
      (detectedNotes.length > 0 || polyphonicResult.isStableMismatch || polyphonicResult.isStableMatch)
    ) {
      deps.markPerformancePromptAttempt();
    }

    if (shouldUseLowConfidenceFallback) {
      const nowMs = deps.now();
      if (nowMs - lastLowConfidenceMessageAtMs >= 1500) {
        lastLowConfidenceMessageAtMs = nowMs;
        deps.setResultMessage(buildLowConfidenceMicPolyphonicMessage());
      }
      return true;
    }

    const matchedTargetNotes = detectedNotes.filter((note) => targetPitchClasses.includes(note));
    const nextFoundNotes = new Set(matchedTargetNotes);
    if (!setsEqual(deps.state.currentMelodyEventFoundNotes, nextFoundNotes)) {
      deps.state.currentMelodyEventFoundNotes = nextFoundNotes;
      deps.redrawFretboard();
    }

    if (isPerformanceStyleMode(trainingMode)) {
      if (deps.state.performancePromptResolved) return true;
      const compensatedPromptStartedAtMs = resolveLatencyCompensatedPromptStartedAtMs(
        deps.state.startTime,
        deps.state.performanceMicLatencyCompensationMs ?? 0
      );
      const shouldForgivePerformanceTiming = shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: compensatedPromptStartedAtMs,
        nowMs: deps.now(),
        preset: deps.state.performanceTimingLeniencyPreset ?? 'normal',
      });
      if (polyphonicResult.isStableMatch) {
        const nowMs = deps.now();
        const elapsed = (nowMs - deps.state.startTime) / 1000;
        deps.performanceResolveSuccess(elapsed, resolvePerformanceTimingGrade(nowMs));
        return true;
      }

      if (detectedNotes.length > 0) {
        const hasOutOfTargetNotes = detectedNotes.some((note) => !targetPitchClasses.includes(note));
        if (!hasOutOfTargetNotes && matchedTargetNotes.length < targetPitchClasses.length) {
          deps.setResultMessage(
            `Heard: ${polyphonicResult.detectedNotesText} [${matchedTargetNotes.length}/${targetPitchClasses.length}]`
          );
          return true;
        }
        if (hasOutOfTargetNotes) {
          if (shouldForgivePerformanceTiming) {
            return true;
          }
          deps.recordPerformanceTimelineWrongAttempt(
            detectedNotes[0] ?? polyphonicResult.detectedNotesText ?? '...'
          );
          deps.setResultMessage(
            `Heard: ${polyphonicResult.detectedNotesText || '...'} [off target]`,
            'error'
          );
        }
      }

      return true;
    }

    if (polyphonicResult.isStableMatch) {
      const elapsed = (deps.now() - deps.state.startTime) / 1000;
      deps.displayResult(true, elapsed);
      return true;
    }

    if (detectedNotes.length > 0) {
      const hasOutOfTargetNotes = detectedNotes.some((note) => !targetPitchClasses.includes(note));
      if (!hasOutOfTargetNotes && matchedTargetNotes.length < targetPitchClasses.length) {
        deps.setResultMessage(
          `Heard: ${polyphonicResult.detectedNotesText} [${matchedTargetNotes.length}/${targetPitchClasses.length}]`
        );
        return true;
      }
    }

    if (polyphonicResult.isStableMismatch) {
      deps.handleMelodyPolyphonicMismatch(
        prompt,
        polyphonicResult.detectedNotesText || '...',
        'mic melody polyphonic mismatch redraw'
      );
    }

    return true;
  }

  function handleMidiMelodyUpdate(event: MidiNoteEvent) {
    const prompt = deps.state.currentPrompt;
    if (!prompt) return;
    const trainingMode = deps.getTrainingMode();

    if (!isPolyphonicMelodyPrompt(prompt)) {
      if (event.kind === 'noteoff') return;
      deps.handleStableMonophonicDetectedNote(event.noteName);
      return;
    }

    const targetPitchClasses = getPolyphonicMelodyTargetPitchClasses(prompt);
    const heldNoteNames = event.heldNoteNames;
    const detectedNotesText = formatDetectedMidiChordNotes(heldNoteNames);
    const matchedHeldTargetNotes = heldNoteNames.filter((note) => targetPitchClasses.includes(note));
    deps.state.currentMelodyEventFoundNotes = new Set(matchedHeldTargetNotes);
    deps.redrawFretboard();

    if (event.kind === 'noteoff' && heldNoteNames.length === 0) {
      return;
    }

    if (isPerformanceStyleMode(trainingMode)) {
      if (deps.state.performancePromptResolved) return;
      const compensatedPromptStartedAtMs = resolveLatencyCompensatedPromptStartedAtMs(
        deps.state.startTime,
        deps.state.performanceMicLatencyCompensationMs ?? 0
      );
      const shouldForgivePerformanceTiming = shouldForgivePerformanceTimingBoundaryAttempt({
        prompt,
        promptStartedAtMs: compensatedPromptStartedAtMs,
        nowMs: deps.now(),
        preset: deps.state.performanceTimingLeniencyPreset ?? 'normal',
      });

      if (!(event.kind === 'noteoff' && heldNoteNames.length === 0)) {
        deps.markPerformancePromptAttempt();
      }

      if (areMidiHeldNotesMatchingTargetChord(heldNoteNames, targetPitchClasses)) {
        const nowMs = deps.now();
        const elapsed = (nowMs - deps.state.startTime) / 1000;
        deps.performanceResolveSuccess(elapsed, resolvePerformanceTimingGrade(nowMs));
        return;
      }

      const heldUniqueCount = new Set(heldNoteNames).size;
      if (heldUniqueCount < targetPitchClasses.length) {
        deps.setResultMessage(
          `Heard: ${detectedNotesText} [${deps.state.currentMelodyEventFoundNotes.size}/${targetPitchClasses.length}]`
        );
        return;
      }

      if (shouldForgivePerformanceTiming) {
        return;
      }

      deps.setResultMessage(`Heard: ${detectedNotesText} [off target]`, 'error');
      deps.recordPerformanceTimelineWrongAttempt(heldNoteNames[0] ?? detectedNotesText);
      return;
    }

    if (areMidiHeldNotesMatchingTargetChord(heldNoteNames, targetPitchClasses)) {
      const elapsed = (deps.now() - deps.state.startTime) / 1000;
      deps.displayResult(true, elapsed);
      return;
    }

    const heldUniqueCount = new Set(heldNoteNames).size;
    if (heldUniqueCount < targetPitchClasses.length) {
      deps.setResultMessage(
        `Heard: ${detectedNotesText} [${deps.state.currentMelodyEventFoundNotes.size}/${targetPitchClasses.length}]`
      );
      return;
    }

    deps.handleMelodyPolyphonicMismatch(prompt, detectedNotesText, 'midi melody polyphonic mismatch redraw');
  }

  return {
    handleMicrophonePolyphonicMelodyFrame,
    handleMidiMelodyUpdate,
  };
}
