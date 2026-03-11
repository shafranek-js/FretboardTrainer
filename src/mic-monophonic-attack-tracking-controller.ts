import type { Prompt } from './types';

type AppState = typeof import('./state').state;

export type MicMonophonicAttackTrackingEvent = 'reset' | 'started' | 'rearmed' | 'continued' | 'ignored';

interface MicMonophonicAttackTrackingControllerDeps {
  state: Pick<
    AppState,
    | 'micMonophonicAttackTrackedNote'
    | 'micMonophonicAttackPeakVolume'
    | 'micMonophonicAttackLastVolume'
    | 'micMonophonicFirstDetectedAtMs'
    | 'micLastMonophonicDetectedAtMs'
    | 'studyMelodyRepeatPromptRequiresFreshAttack'
    | 'studyMelodyRepeatPromptSawSilence'
    | 'startTime'
    | 'currentPrompt'
  >;
  getTrainingMode: () => string;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  resolvePerformanceMicDropHoldMs: (eventDurationMs: number | null | undefined) => number;
  shouldResetMicAttackTracking: typeof import('./mic-attack-tracking').shouldResetMicAttackTracking;
  shouldRearmMicOnsetForSameNote: typeof import('./mic-note-reattack').shouldRearmMicOnsetForSameNote;
  shouldResetStudyMelodyOnsetTrackingOnPromptChange: typeof import('./study-melody-prompt-transition').shouldResetStudyMelodyOnsetTrackingOnPromptChange;
  now?: () => number;
}

export function createMicMonophonicAttackTrackingController(
  deps: MicMonophonicAttackTrackingControllerDeps
) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function reset() {
    deps.state.micMonophonicAttackTrackedNote = null;
    deps.state.micMonophonicAttackPeakVolume = 0;
    deps.state.micMonophonicAttackLastVolume = 0;
    deps.state.micMonophonicFirstDetectedAtMs = null;
  }

  function clearFreshAttackGuard(event: MicMonophonicAttackTrackingEvent) {
    if (!deps.state.studyMelodyRepeatPromptRequiresFreshAttack) return;
    if (deps.getTrainingMode() !== 'melody') {
      deps.state.studyMelodyRepeatPromptRequiresFreshAttack = false;
      deps.state.studyMelodyRepeatPromptSawSilence = false;
      return;
    }
    if (!deps.state.studyMelodyRepeatPromptSawSilence) return;
    if (event !== 'started' && event !== 'rearmed') return;
    if (deps.state.micMonophonicFirstDetectedAtMs === null) return;
    if (deps.state.micMonophonicFirstDetectedAtMs < deps.state.startTime) return;
    deps.state.studyMelodyRepeatPromptRequiresFreshAttack = false;
    deps.state.studyMelodyRepeatPromptSawSilence = false;
  }

  function update(detectedNote: string | null, volume: number): MicMonophonicAttackTrackingEvent {
    const nowMs = now();
    const eventDurationMs = deps.state.currentPrompt?.melodyEventDurationMs ?? null;
    const melodyAdaptive = deps.isMelodyWorkflowMode(deps.getTrainingMode());
    const performanceDropHoldMs = melodyAdaptive
      ? deps.resolvePerformanceMicDropHoldMs(eventDurationMs)
      : undefined;

    if (
      deps.shouldResetMicAttackTracking({
        detectedNote,
        trackedNote: deps.state.micMonophonicAttackTrackedNote,
        trainingMode: deps.getTrainingMode(),
        lastDetectedAtMs: deps.state.micLastMonophonicDetectedAtMs,
        nowMs,
        performanceDropHoldMs,
      })
    ) {
      reset();
      return 'reset';
    }
    if (!detectedNote) return 'ignored';

    if (deps.state.micMonophonicAttackTrackedNote !== detectedNote) {
      deps.state.micMonophonicAttackTrackedNote = detectedNote;
      deps.state.micMonophonicAttackPeakVolume = volume;
      deps.state.micMonophonicAttackLastVolume = volume;
      deps.state.micMonophonicFirstDetectedAtMs = nowMs;
      return 'started';
    }

    const onsetAgeMs =
      deps.state.micMonophonicFirstDetectedAtMs === null
        ? null
        : Math.max(0, nowMs - deps.state.micMonophonicFirstDetectedAtMs);
    if (
      deps.shouldRearmMicOnsetForSameNote({
        performanceAdaptive: melodyAdaptive,
        onsetAgeMs,
        currentVolume: volume,
        previousVolume: deps.state.micMonophonicAttackLastVolume,
        peakVolume: deps.state.micMonophonicAttackPeakVolume,
        eventDurationMs,
      })
    ) {
      deps.state.micMonophonicAttackPeakVolume = volume;
      deps.state.micMonophonicFirstDetectedAtMs = nowMs;
      deps.state.micMonophonicAttackLastVolume = volume;
      return 'rearmed';
    }

    if (volume > deps.state.micMonophonicAttackPeakVolume) {
      deps.state.micMonophonicAttackPeakVolume = volume;
    }
    deps.state.micMonophonicAttackLastVolume = volume;
    return 'continued';
  }

  function markSilenceDuringFreshAttackWait() {
    if (deps.getTrainingMode() !== 'melody') return;
    if (!deps.state.studyMelodyRepeatPromptRequiresFreshAttack) return;
    deps.state.studyMelodyRepeatPromptSawSilence = true;
  }

  function syncPromptTransition(previousPrompt: Prompt | null, nextPrompt: Prompt) {
    deps.state.studyMelodyRepeatPromptRequiresFreshAttack =
      deps.shouldResetStudyMelodyOnsetTrackingOnPromptChange(
        deps.getTrainingMode(),
        previousPrompt,
        nextPrompt
      );
    deps.state.studyMelodyRepeatPromptSawSilence = false;
    if (deps.state.studyMelodyRepeatPromptRequiresFreshAttack) {
      reset();
    }
  }

  return {
    reset,
    update,
    clearFreshAttackGuard,
    markSilenceDuringFreshAttackWait,
    syncPromptTransition,
  };
}
