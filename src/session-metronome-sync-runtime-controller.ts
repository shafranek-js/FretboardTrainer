import type { MelodyDefinition } from './melody-library';

type AppDom = typeof import('./dom').dom;
type AppState = typeof import('./state').state;

interface SessionMetronomeSyncRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode' | 'metronomeEnabled' | 'melodyDemoBpm'>;
  state: Pick<
    AppState,
    | 'isListening'
    | 'performanceRuntimeStartedAtMs'
    | 'performancePrerollLeadInVisible'
  >;
  isMelodyWorkflowMode: (trainingMode: string) => boolean;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getSelectedAdjustedMelody: () => Pick<MelodyDefinition, 'id' | 'events' | 'sourceTimeSignature'> | null;
  resolveMelodyMetronomeMeterProfile: typeof import('./melody-meter').resolveMelodyMetronomeMeterProfile;
  setMetronomeMeter: typeof import('./metronome').setMetronomeMeter;
  isMetronomeRunning: typeof import('./metronome').isMetronomeRunning;
  stopMetronome: typeof import('./metronome').stopMetronome;
  getMetronomeBpm: typeof import('./metronome').getMetronomeBpm;
  setMetronomeTempo: typeof import('./metronome').setMetronomeTempo;
  startMetronome: typeof import('./metronome').startMetronome;
  clampMelodyPlaybackBpm: typeof import('./melody-timeline-duration').clampMelodyPlaybackBpm;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
}

export function createSessionMetronomeSyncRuntimeController(
  deps: SessionMetronomeSyncRuntimeControllerDeps
) {
  async function syncToPromptStart() {
    if (!deps.state.isListening) return;

    const trainingMode = deps.dom.trainingMode.value;
    if (!deps.isMelodyWorkflowMode(trainingMode)) return;

    deps.setMetronomeMeter(deps.resolveMelodyMetronomeMeterProfile(deps.getSelectedAdjustedMelody()));

    if (deps.isPerformanceStyleMode(trainingMode)) {
      if (deps.state.performanceRuntimeStartedAtMs === null || deps.state.performancePrerollLeadInVisible) {
        return;
      }
    }

    if (!deps.dom.metronomeEnabled.checked) {
      if (deps.isMetronomeRunning()) {
        deps.stopMetronome();
      }
      return;
    }

    const bpm = deps.clampMelodyPlaybackBpm(deps.dom.melodyDemoBpm.value);
    try {
      if (deps.isMetronomeRunning()) {
        if (deps.getMetronomeBpm() !== bpm) {
          await deps.setMetronomeTempo(bpm);
        }
        return;
      }
      await deps.startMetronome(bpm);
    } catch (error) {
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to synchronize metronome timing', error));
    }
  }

  return {
    syncToPromptStart,
  };
}
