import type { MelodyDefinition } from '../melody-library';
import { resolveSharedMelodyTempoBpm, shouldLinkMelodyTempoControls } from '../shared-melody-tempo';
import { resolveMelodyPlaybackTempoBpm, storeMelodyPlaybackTempoBpm } from '../melody-playback-tempo';
import {
  formatMelodyTimelineZoomPercent,
  normalizeMelodyTimelineZoomPercent,
} from '../melody-timeline-zoom';
import {
  formatScrollingTabPanelZoomPercent,
  normalizeScrollingTabPanelZoomPercent,
} from '../scrolling-tab-panel-zoom';

interface MelodyTempoControllerDom {
  trainingMode: HTMLSelectElement;
  metronomeEnabled: HTMLInputElement;
  metronomeBpm: HTMLInputElement;
  metronomeBpmValue: HTMLElement;
  metronomeToggleBtn: HTMLButtonElement;
  melodyDemoBpm: HTMLInputElement;
  melodyTimelineZoom: HTMLInputElement;
  melodyTimelineZoomValue: HTMLElement;
  scrollingTabZoom: HTMLInputElement;
  scrollingTabZoomValue: HTMLElement;
}

interface MelodyTempoControllerState {
  isListening: boolean;
  performanceRuntimeStartedAtMs: number | null;
  performancePrerollLeadInVisible: boolean;
  melodyPlaybackBpmById?: Record<string, number>;
  melodyTimelineZoomPercent: number;
  scrollingTabZoomPercent: number;
}

export interface MelodyTempoControllerDeps<TMelody extends Pick<MelodyDefinition, 'id' | 'sourceTempoBpm'>> {
  dom: MelodyTempoControllerDom;
  state: MelodyTempoControllerState;
  getSelectedMelody: () => TMelody | null;
  syncMelodyDemoBpmDisplay: () => void;
  syncMetronomeMeterFromSelectedMelody: () => void;
  getClampedMetronomeBpmFromInput: () => number;
  startMetronome: (bpm: number, options?: { alignToPerformanceTimeMs?: number | null }) => Promise<void>;
  stopMetronome: () => void;
  setMetronomeTempo: (bpm: number) => Promise<void>;
  isMetronomeRunning: () => boolean;
  resetMetronomeVisualIndicator: () => void;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  isMelodyDemoPlaying: () => boolean;
  isMelodyWorkflowMode: (mode: string) => boolean;
  isPerformanceStyleMode: (mode: string) => boolean;
}

export function createMelodyTempoController<TMelody extends Pick<MelodyDefinition, 'id' | 'sourceTempoBpm'>>(deps: MelodyTempoControllerDeps<TMelody>) {
  function syncHiddenMetronomeTempoFromSharedTempo() {
    const { melodyBpm, metronomeBpm } = resolveSharedMelodyTempoBpm(
      Number.parseInt(deps.dom.melodyDemoBpm.value, 10)
    );
    deps.dom.melodyDemoBpm.value = String(melodyBpm);
    deps.syncMelodyDemoBpmDisplay();
    deps.dom.metronomeBpm.value = String(metronomeBpm);
    deps.dom.metronomeBpmValue.textContent = String(metronomeBpm);
  }

  async function syncMelodyTempoFromMetronomeIfLinked() {
    syncHiddenMetronomeTempoFromSharedTempo();
    if (!shouldLinkMelodyTempoControls(deps.dom.trainingMode.value, deps.dom.metronomeEnabled.checked)) {
      return;
    }
    const { melodyBpm } = resolveSharedMelodyTempoBpm(Number.parseInt(deps.dom.melodyDemoBpm.value, 10));
    deps.dom.melodyDemoBpm.value = String(melodyBpm);
    deps.syncMelodyDemoBpmDisplay();
  }

  function hydrateMelodyTempoForSelectedMelody() {
    const melody = deps.getSelectedMelody();
    const bpm = resolveMelodyPlaybackTempoBpm(
      melody,
      deps.state.melodyPlaybackBpmById,
      deps.dom.melodyDemoBpm.value
    );
    deps.dom.melodyDemoBpm.value = String(bpm);
    deps.syncMelodyDemoBpmDisplay();
    syncHiddenMetronomeTempoFromSharedTempo();
    void syncMetronomeTempoFromMelodyIfLinked();
  }

  function persistSelectedMelodyTempoOverride() {
    const melody = deps.getSelectedMelody();
    const { bpm, byId } = storeMelodyPlaybackTempoBpm(
      deps.state.melodyPlaybackBpmById,
      melody,
      deps.dom.melodyDemoBpm.value
    );
    deps.state.melodyPlaybackBpmById = byId;
    deps.dom.melodyDemoBpm.value = String(bpm);
    deps.syncMelodyDemoBpmDisplay();
    syncHiddenMetronomeTempoFromSharedTempo();
  }

  async function syncMetronomeTempoFromMelodyIfLinked() {
    syncHiddenMetronomeTempoFromSharedTempo();
    await syncMelodyMetronomeRuntime();
  }

  function isMelodyTransportRunningForMetronome() {
    const demoPlaying = deps.isMelodyDemoPlaying();
    const melodySessionRunning =
      deps.state.isListening &&
      deps.isMelodyWorkflowMode(deps.dom.trainingMode.value) &&
      (!deps.isPerformanceStyleMode(deps.dom.trainingMode.value) ||
        (deps.state.performanceRuntimeStartedAtMs !== null && !deps.state.performancePrerollLeadInVisible));
    return demoPlaying || melodySessionRunning;
  }

  async function startMelodyMetronomeIfEnabled(options?: { alignToPerformanceTimeMs?: number | null }) {
    deps.syncMetronomeMeterFromSelectedMelody();
    syncHiddenMetronomeTempoFromSharedTempo();
    if (!deps.dom.metronomeEnabled.checked || !deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)) {
      deps.stopMetronome();
      deps.resetMetronomeVisualIndicator();
      return;
    }
    const bpm = deps.getClampedMetronomeBpmFromInput();
    try {
      await deps.startMetronome(bpm, {
        alignToPerformanceTimeMs: options?.alignToPerformanceTimeMs ?? null,
      });
    } catch (error) {
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to synchronize metronome timing', error));
    }
  }

  async function syncMelodyMetronomeRuntime() {
    deps.syncMetronomeMeterFromSelectedMelody();
    syncHiddenMetronomeTempoFromSharedTempo();
    if (!deps.dom.metronomeEnabled.checked || !isMelodyTransportRunningForMetronome()) {
      deps.stopMetronome();
      deps.resetMetronomeVisualIndicator();
      return;
    }
    const bpm = deps.getClampedMetronomeBpmFromInput();
    try {
      if (deps.isMetronomeRunning()) {
        await deps.setMetronomeTempo(bpm);
      } else {
        await deps.startMetronome(bpm);
      }
    } catch (error) {
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to synchronize metronome timing', error));
    }
  }

  function renderMetronomeToggleButton() {
    const enabled = deps.dom.metronomeEnabled.checked;
    const label = enabled ? 'Metronome on (click to turn off)' : 'Metronome off (click to turn on)';
    deps.dom.metronomeToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    deps.dom.metronomeToggleBtn.setAttribute('aria-label', label);
    deps.dom.metronomeToggleBtn.title = label;
    deps.dom.metronomeToggleBtn.classList.toggle('bg-amber-700', enabled);
    deps.dom.metronomeToggleBtn.classList.toggle('border-amber-400', enabled);
    deps.dom.metronomeToggleBtn.classList.toggle('text-white', enabled);
    deps.dom.metronomeToggleBtn.classList.toggle('bg-slate-700', !enabled);
    deps.dom.metronomeToggleBtn.classList.toggle('border-amber-500/60', !enabled);
    deps.dom.metronomeToggleBtn.classList.toggle('text-amber-100', !enabled);
  }

  function syncMelodyTimelineZoomDisplay() {
    deps.state.melodyTimelineZoomPercent = normalizeMelodyTimelineZoomPercent(deps.dom.melodyTimelineZoom.value);
    deps.dom.melodyTimelineZoom.value = String(deps.state.melodyTimelineZoomPercent);
    deps.dom.melodyTimelineZoomValue.textContent = formatMelodyTimelineZoomPercent(
      deps.state.melodyTimelineZoomPercent
    );
  }

  function syncScrollingTabZoomDisplay() {
    deps.state.scrollingTabZoomPercent = normalizeScrollingTabPanelZoomPercent(deps.dom.scrollingTabZoom.value);
    deps.dom.scrollingTabZoom.value = String(deps.state.scrollingTabZoomPercent);
    deps.dom.scrollingTabZoomValue.textContent = formatScrollingTabPanelZoomPercent(
      deps.state.scrollingTabZoomPercent
    );
  }

  return {
    syncMelodyTempoFromMetronomeIfLinked,
    hydrateMelodyTempoForSelectedMelody,
    persistSelectedMelodyTempoOverride,
    syncHiddenMetronomeTempoFromSharedTempo,
    syncMetronomeTempoFromMelodyIfLinked,
    startMelodyMetronomeIfEnabled,
    syncMelodyMetronomeRuntime,
    renderMetronomeToggleButton,
    syncMelodyTimelineZoomDisplay,
    syncScrollingTabZoomDisplay,
  };
}

