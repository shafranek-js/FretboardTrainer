import type { MelodyDefinition } from './melody-library';
import { resolvePerformanceTransportFrame } from './performance-transport';
import { clampMelodyPlaybackBpm, getMelodyEventPlaybackDurationExactMs } from './melody-timeline-duration';
import { formatMelodyStudyRange, isDefaultMelodyStudyRange, normalizeMelodyStudyRange } from './melody-study-range';

type AppDom = typeof import('./dom').dom;
import type { AppState } from './state';

type PerformanceTransportContext = {
  melody: MelodyDefinition;
  studyRange: { startIndex: number; endIndex: number };
  bpm: number;
};

interface PerformanceTransportRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode' | 'melodySelector' | 'melodyDemoBpm'>;
  state: Pick<
    AppState,
    | 'activeSessionStats'
    | 'currentInstrument'
    | 'currentMelodyEventFoundNotes'
    | 'currentMelodyEventIndex'
    | 'currentMelodyId'
    | 'currentPrompt'
    | 'isListening'
    | 'melodyStudyRangeById'
    | 'melodyStudyRangeStartIndex'
    | 'pendingSessionStopResultMessage'
    | 'performanceActiveEventIndex'
    | 'performancePromptResolved'
    | 'performancePrerollDurationMs'
    | 'performancePrerollLeadInVisible'
    | 'performancePrerollStartedAtMs'
    | 'performancePrerollStepIndex'
    | 'performanceRunCompleted'
    | 'performanceRuntimeStartedAtMs'
    | 'performanceTransportAnimationId'
    | 'startTime'
  >;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getMelodyById: (melodyId: string, instrument: AppState['currentInstrument']) => MelodyDefinition | null;
  getPracticeAdjustedMelody: (melody: MelodyDefinition) => MelodyDefinition;
  redrawFretboard: () => void;
  scheduleTimelineRender: () => void;
  clearPerformanceTimelineFeedback: () => void;
  clearWrongDetectedHighlight: () => void;
  onResolveMissedPrompt: () => void;
  onAdvancePrompt: () => void;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
  now?: () => number;
}

export function createPerformanceTransportRuntimeController(deps: PerformanceTransportRuntimeControllerDeps) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function syncTimelineUi() {
    deps.redrawFretboard();
    deps.scheduleTimelineRender();
  }

  function beginPrerollTimeline(pulseCount: number, durationMs: number) {
    deps.state.performancePrerollLeadInVisible = pulseCount > 0;
    deps.state.performancePrerollStartedAtMs = pulseCount > 0 ? now() : null;
    deps.state.performancePrerollDurationMs = pulseCount > 0 ? Math.max(0, durationMs) : 0;
    deps.state.performancePrerollStepIndex = pulseCount > 0 ? 0 : null;
    syncTimelineUi();
  }

  function advancePrerollTimeline(stepIndex: number, pulseCount: number) {
    if (!deps.state.isListening) return;
    if (!deps.state.performancePrerollLeadInVisible || pulseCount <= 0) return;
    deps.state.performancePrerollStepIndex = Math.max(0, Math.min(pulseCount - 1, stepIndex));
    syncTimelineUi();
  }

  function finishPrerollTimeline() {
    deps.state.performancePrerollLeadInVisible = false;
    deps.state.performancePrerollStartedAtMs = null;
    deps.state.performancePrerollDurationMs = 0;
    deps.state.performancePrerollStepIndex = null;
    syncTimelineUi();
  }

  function getRuntimeElapsedBeforeEventSec(targetEventIndex: number) {
    const selectedMelodyId = deps.dom.melodySelector.value.trim();
    const melody = selectedMelodyId ? deps.getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
    if (!melody || melody.events.length === 0) return 0;

    const rangeStart = Math.max(0, Math.min(deps.state.melodyStudyRangeStartIndex, melody.events.length - 1));
    const clampedTargetIndex = Math.max(rangeStart, Math.min(Math.round(targetEventIndex), melody.events.length));
    let totalSec = 0;
    for (let index = rangeStart; index < clampedTargetIndex; index += 1) {
      const event = melody.events[index];
      if (!event) continue;
      totalSec += getMelodyEventPlaybackDurationExactMs(event, Number(deps.dom.melodyDemoBpm.value), melody) / 1000;
    }
    return totalSec;
  }

  function startRuntimeClock(targetEventIndex = deps.state.melodyStudyRangeStartIndex) {
    if (!deps.isPerformanceStyleMode(deps.dom.trainingMode.value)) return;
    const elapsedSec = getRuntimeElapsedBeforeEventSec(targetEventIndex);
    deps.state.performanceRuntimeStartedAtMs = now() - Math.round(elapsedSec * 1000);
    scheduleLoop();
  }

  function getActiveTransportContext(): PerformanceTransportContext | null {
    if (!deps.isPerformanceStyleMode(deps.dom.trainingMode.value)) return null;
    const selectedMelodyId = deps.dom.melodySelector.value.trim();
    const baseMelody = selectedMelodyId ? deps.getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
    if (!baseMelody) return null;

    const melody = deps.getPracticeAdjustedMelody(baseMelody);
    if (melody.events.length === 0) return null;

    return {
      melody,
      studyRange: normalizeMelodyStudyRange(deps.state.melodyStudyRangeById?.[melody.id], melody.events.length),
      bpm: clampMelodyPlaybackBpm(deps.dom.melodyDemoBpm.value),
    };
  }

  function syncPromptEventFromRuntime(nowMs = now()) {
    const context = getActiveTransportContext();
    if (context) {
      deps.state.currentMelodyId = context.melody.id;
    }

    let activeEventIndex = deps.state.performanceActiveEventIndex;
    if (
      context &&
      (!(typeof activeEventIndex === 'number') ||
        activeEventIndex < context.studyRange.startIndex ||
        activeEventIndex > context.studyRange.endIndex) &&
      deps.state.performanceRuntimeStartedAtMs !== null
    ) {
      const transportFrame = resolvePerformanceTransportFrame({
        melody: context.melody,
        bpm: context.bpm,
        studyRange: context.studyRange,
        runtimeStartedAtMs: deps.state.performanceRuntimeStartedAtMs,
        nowMs,
      });
      if (!transportFrame.isComplete && transportFrame.activeEventIndex !== null) {
        activeEventIndex = transportFrame.activeEventIndex;
        deps.state.performanceActiveEventIndex = activeEventIndex;
        deps.state.currentMelodyEventIndex = activeEventIndex;
        if (transportFrame.eventStartedAtMs !== null) {
          deps.state.startTime = transportFrame.eventStartedAtMs;
        }
      }
    }

    return {
      context,
      activeEventIndex,
    };
  }

  function syncTransport(nowMs = now()) {
    if (
      !deps.isPerformanceStyleMode(deps.dom.trainingMode.value) ||
      !deps.state.isListening ||
      deps.state.performanceRuntimeStartedAtMs === null
    ) {
      return;
    }

    const context = getActiveTransportContext();
    if (!context) return;
    deps.state.currentMelodyId = context.melody.id;

    const transportFrame = resolvePerformanceTransportFrame({
      melody: context.melody,
      bpm: context.bpm,
      studyRange: context.studyRange,
      runtimeStartedAtMs: deps.state.performanceRuntimeStartedAtMs,
      nowMs,
    });

    if (transportFrame.isComplete) {
      if (deps.state.currentPrompt && !deps.state.performancePromptResolved) {
        deps.onResolveMissedPrompt();
      }
      if (deps.dom.trainingMode.value === 'performance' && deps.state.activeSessionStats) {
        deps.state.activeSessionStats.completedRun = true;
        deps.state.performanceRunCompleted = true;
      }
      deps.state.performanceActiveEventIndex = null;
      deps.state.currentMelodyEventIndex = context.studyRange.endIndex + 1;
      deps.state.pendingSessionStopResultMessage = {
        text: isDefaultMelodyStudyRange(context.studyRange, context.melody.events.length)
          ? `Performance complete! (${context.melody.name})`
          : `Performance range complete! (${context.melody.name}, ${formatMelodyStudyRange(
              context.studyRange,
              context.melody.events.length
            )})`,
        tone: 'success',
      };
      if (deps.dom.trainingMode.value === 'practice') {
        deps.state.pendingSessionStopResultMessage = null;
        deps.clearPerformanceTimelineFeedback();
        deps.state.currentMelodyEventFoundNotes.clear();
        deps.state.performanceRuntimeStartedAtMs = now();
        deps.state.performanceActiveEventIndex = context.studyRange.startIndex;
        deps.state.currentMelodyEventIndex = context.studyRange.startIndex;
        deps.onAdvancePrompt();
        return;
      }
      deps.onAdvancePrompt();
      return;
    }

    const activeEventIndex = transportFrame.activeEventIndex;
    if (activeEventIndex === null) return;

    if (deps.state.performanceActiveEventIndex === activeEventIndex && deps.state.currentPrompt) {
      if (transportFrame.eventStartedAtMs !== null) {
        deps.state.startTime = transportFrame.eventStartedAtMs;
      }
      return;
    }

    if (deps.state.currentPrompt && !deps.state.performancePromptResolved) {
      deps.onResolveMissedPrompt();
    }

    deps.state.performanceActiveEventIndex = activeEventIndex;
    deps.state.currentMelodyEventIndex = activeEventIndex;
    deps.state.currentMelodyEventFoundNotes.clear();
    deps.clearWrongDetectedHighlight();
    deps.onAdvancePrompt();
    if (transportFrame.eventStartedAtMs !== null) {
      deps.state.startTime = transportFrame.eventStartedAtMs;
    }
  }

  function stopLoop() {
    if (deps.state.performanceTransportAnimationId) {
      deps.cancelAnimationFrame(deps.state.performanceTransportAnimationId);
      deps.state.performanceTransportAnimationId = 0;
    }
  }

  function scheduleLoop() {
    if (deps.state.performanceTransportAnimationId) return;
    const tick = () => {
      deps.state.performanceTransportAnimationId = 0;
      if (
        !deps.state.isListening ||
        !deps.isPerformanceStyleMode(deps.dom.trainingMode.value) ||
        deps.state.performanceRuntimeStartedAtMs === null
      ) {
        return;
      }

      syncTransport();

      if (
        deps.state.isListening &&
        deps.isPerformanceStyleMode(deps.dom.trainingMode.value) &&
        deps.state.performanceRuntimeStartedAtMs !== null
      ) {
        deps.state.performanceTransportAnimationId = deps.requestAnimationFrame(tick);
      }
    };
    deps.state.performanceTransportAnimationId = deps.requestAnimationFrame(tick);
  }

  return {
    beginPrerollTimeline,
    advancePrerollTimeline,
    finishPrerollTimeline,
    getRuntimeElapsedBeforeEventSec,
    startRuntimeClock,
    getActiveTransportContext,
    syncPromptEventFromRuntime,
    syncTransport,
    stopLoop,
    scheduleLoop,
  };
}
