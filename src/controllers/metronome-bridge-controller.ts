interface MetronomeBridgeDom {
  metronomeVolume: HTMLInputElement;
  metronomeVolumeValue: HTMLElement;
}

interface MetronomeRuntimeBridge {
  syncBpmDisplay(): void;
  getClampedBpmFromInput(): number;
  resetVisualIndicator(): void;
}

interface MelodyTempoBridge {
  syncMelodyTempoFromMetronomeIfLinked(): Promise<void>;
  hydrateMelodyTempoForSelectedMelody(): void;
  persistSelectedMelodyTempoOverride(): void;
  syncHiddenMetronomeTempoFromSharedTempo(): void;
  syncMetronomeTempoFromMelodyIfLinked(): Promise<void>;
  startMelodyMetronomeIfEnabled(options?: { alignToPerformanceTimeMs?: number | null }): Promise<void>;
  syncMelodyMetronomeRuntime(): Promise<void>;
  renderMetronomeToggleButton(): void;
  syncMelodyTimelineZoomDisplay(): void;
  syncScrollingTabZoomDisplay(): void;
}

export interface MetronomeBridgeControllerDeps {
  dom: MetronomeBridgeDom;
  metronomeRuntime: MetronomeRuntimeBridge;
  melodyTempo: MelodyTempoBridge;
  clampMetronomeVolumePercent: (value: number) => number;
  setMetronomeVolume: (value: number) => void;
}

export function createMetronomeBridgeController(deps: MetronomeBridgeControllerDeps) {
  function syncMetronomeBpmDisplay() {
    deps.metronomeRuntime.syncBpmDisplay();
  }

  function getClampedMetronomeBpmFromInput() {
    return deps.metronomeRuntime.getClampedBpmFromInput();
  }

  function resetMetronomeVisualIndicator() {
    deps.metronomeRuntime.resetVisualIndicator();
  }

  function syncMelodyTempoFromMetronomeIfLinked() {
    return deps.melodyTempo.syncMelodyTempoFromMetronomeIfLinked();
  }

  function hydrateMelodyTempoForSelectedMelody() {
    deps.melodyTempo.hydrateMelodyTempoForSelectedMelody();
  }

  function persistSelectedMelodyTempoOverride() {
    deps.melodyTempo.persistSelectedMelodyTempoOverride();
  }

  function syncHiddenMetronomeTempoFromSharedTempo() {
    deps.melodyTempo.syncHiddenMetronomeTempoFromSharedTempo();
  }

  function syncMetronomeTempoFromMelodyIfLinked() {
    return deps.melodyTempo.syncMetronomeTempoFromMelodyIfLinked();
  }

  function startMelodyMetronomeIfEnabled(options?: { alignToPerformanceTimeMs?: number | null }) {
    return deps.melodyTempo.startMelodyMetronomeIfEnabled(options);
  }

  function syncMelodyMetronomeRuntime() {
    return deps.melodyTempo.syncMelodyMetronomeRuntime();
  }

  function renderMetronomeToggleButton() {
    deps.melodyTempo.renderMetronomeToggleButton();
  }

  function syncMelodyTimelineZoomDisplay() {
    deps.melodyTempo.syncMelodyTimelineZoomDisplay();
  }

  function syncScrollingTabZoomDisplay() {
    deps.melodyTempo.syncScrollingTabZoomDisplay();
  }

  function syncMetronomeVolumeDisplayAndRuntime() {
    const clampedVolumePercent = deps.clampMetronomeVolumePercent(
      Number.parseInt(deps.dom.metronomeVolume.value, 10)
    );
    deps.dom.metronomeVolume.value = String(clampedVolumePercent);
    deps.dom.metronomeVolumeValue.textContent = `${clampedVolumePercent}%`;
    deps.setMetronomeVolume(clampedVolumePercent);
  }

  return {
    syncMetronomeBpmDisplay,
    getClampedMetronomeBpmFromInput,
    resetMetronomeVisualIndicator,
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
    syncMetronomeVolumeDisplayAndRuntime,
  };
}
