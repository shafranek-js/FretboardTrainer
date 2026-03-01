import { executeAudioPolyphonicReaction } from './process-audio-reaction-executors';
import { buildAudioPolyphonicReactionPlan, buildMidiPolyphonicReactionPlan } from './session-detection-reactions';
import { areMidiHeldNotesMatchingTargetChord, formatDetectedMidiChordNotes } from './midi-chord-evaluation';
import type { MidiNoteEvent } from './midi-runtime';
import type { Prompt } from './types';
import {
  buildLowConfidenceMicPolyphonicMessage,
  isLowConfidenceMicPolyphonicResult,
} from './mic-polyphonic-low-confidence';

interface MicPolyphonicResult {
  detectedNotesText: string;
  nextStableChordCounter: number;
  isStableMatch: boolean;
  isStableMismatch: boolean;
  fallbackFrom?: string | null;
  warnings?: string[];
}

interface PolyphonicChordDetectionControllerDeps {
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
    showingAllNotes: boolean;
    startTime: number;
    activeSessionStats: unknown;
    currentInstrument: unknown;
    micPolyphonicDetectorProvider: string;
  };
  requiredStableFrames: number;
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
  performanceNow(): number;
  now(): number;
  displayResult(correct: boolean, elapsedSeconds: number): void;
  recordSessionAttempt(
    activeSessionStats: unknown,
    prompt: Prompt,
    correct: boolean,
    elapsedSeconds: number,
    instrument: unknown
  ): void;
  setResultMessage(message: string, tone?: 'neutral' | 'success' | 'error'): void;
  drawFretboard(
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: Prompt['targetChordFingering'],
    activeNotes?: Set<string>
  ): void;
  scheduleSessionCooldown(context: string, delayMs: number, callback: () => void): void;
  redrawFretboard(): void;
}

export function createPolyphonicChordDetectionController(
  deps: PolyphonicChordDetectionControllerDeps
) {
  let lastLowConfidenceMessageAtMs = 0;

  function handleAudioChordFrame(frameVolumeRms: number) {
    const prompt = deps.state.currentPrompt;
    if (
      !prompt ||
      !deps.state.analyser ||
      !deps.state.audioContext ||
      !deps.state.frequencyDataArray
    ) {
      return;
    }

    deps.state.analyser.getFloatFrequencyData(deps.state.frequencyDataArray);
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
      targetChordNotes: prompt.targetChordNotes,
      provider: deps.state.micPolyphonicDetectorProvider,
    });
    deps.state.lastDetectedChord = polyphonicResult.detectedNotesText;
    deps.state.stableChordCounter = polyphonicResult.nextStableChordCounter;
    deps.updateMicPolyphonicDetectorRuntimeStatus(polyphonicResult, deps.performanceNow() - startedAt);

    const shouldUseLowConfidenceFallback =
      isLowConfidenceMicPolyphonicResult(polyphonicResult) &&
      !polyphonicResult.isStableMatch &&
      (polyphonicResult.detectedNotesText.length > 0 || polyphonicResult.isStableMismatch);

    if (shouldUseLowConfidenceFallback) {
      const nowMs = deps.now();
      if (nowMs - lastLowConfidenceMessageAtMs >= 1500) {
        lastLowConfidenceMessageAtMs = nowMs;
        deps.setResultMessage(buildLowConfidenceMicPolyphonicMessage());
      }
      return;
    }

    const reactionPlan = buildAudioPolyphonicReactionPlan({
      isStableMatch: polyphonicResult.isStableMatch,
      isStableMismatch: polyphonicResult.isStableMismatch,
      showingAllNotes: deps.state.showingAllNotes,
    });
    executeAudioPolyphonicReaction({
      reactionPlan,
      detectedNotesText: polyphonicResult.detectedNotesText,
      onSuccess: () => {
        const elapsed = (deps.now() - deps.state.startTime) / 1000;
        deps.displayResult(true, elapsed);
      },
      onMismatchRecordAttempt: () => {
        deps.recordSessionAttempt(
          deps.state.activeSessionStats,
          prompt,
          false,
          0,
          deps.state.currentInstrument
        );
      },
      setResultMessage: deps.setResultMessage,
      drawHintFretboard: () => {
        deps.drawFretboard(false, null, null, prompt.targetChordFingering, new Set());
      },
      scheduleCooldownRedraw: (delayMs) => {
        deps.scheduleSessionCooldown('polyphonic mismatch redraw', delayMs, () => {
          deps.redrawFretboard();
        });
      },
    });
  }

  function handleMidiChordUpdate(event: MidiNoteEvent) {
    const prompt = deps.state.currentPrompt;
    const heldNoteNames = event.heldNoteNames;
    const targetChordNotes = prompt?.targetChordNotes ?? [];

    const detectedNotesText = formatDetectedMidiChordNotes(heldNoteNames);
    deps.state.lastDetectedChord = detectedNotesText;

    const reactionPlan = buildMidiPolyphonicReactionPlan({
      hasPrompt: Boolean(prompt),
      targetChordNotes,
      eventKind: event.kind,
      heldNoteNames,
      matchesTargetChord: areMidiHeldNotesMatchingTargetChord(heldNoteNames, targetChordNotes),
    });

    if (reactionPlan.kind === 'ignore' || reactionPlan.kind === 'wait_for_more_notes') {
      return;
    }

    if (reactionPlan.kind === 'success') {
      const elapsed = (deps.now() - deps.state.startTime) / 1000;
      deps.displayResult(true, elapsed);
      return;
    }
    if (!prompt) return;

    deps.recordSessionAttempt(deps.state.activeSessionStats, prompt, false, 0, deps.state.currentInstrument);
    deps.setResultMessage(`Heard: ${detectedNotesText} [wrong]`, 'error');
    if (!deps.state.showingAllNotes) {
      deps.drawFretboard(false, null, null, prompt.targetChordFingering, new Set());
      deps.scheduleSessionCooldown('midi polyphonic mismatch redraw', reactionPlan.cooldownDelayMs, () => {
        deps.redrawFretboard();
      });
    }
  }

  return {
    handleAudioChordFrame,
    handleMidiChordUpdate,
  };
}
