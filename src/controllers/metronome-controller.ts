interface MetronomeControllerDom {
  trainingMode: HTMLSelectElement;
  metronomeEnabled: HTMLInputElement;
  metronomeBpm: HTMLInputElement;
  metronomeBpmValue: HTMLElement;
  metronomeBeatLabel: HTMLElement;
  metronomePulse: HTMLElement;
}

interface MetronomeControllerDeps {
  dom: MetronomeControllerDom;
  clampMetronomeBpm(value: number): number;
  startMetronome(bpm: number): Promise<void>;
  stopMetronome(): void;
  setMetronomeTempo(bpm: number): Promise<void>;
  subscribeMetronomeBeat(handler: (payload: { beatInBar: number; accented: boolean }) => void): void;
  saveSettings(): void;
  formatUserFacingError(prefix: string, error: unknown): string;
  showNonBlockingError(message: string): void;
}

export function createMetronomeController(deps: MetronomeControllerDeps) {
  function syncBpmDisplay() {
    deps.dom.metronomeBpmValue.textContent = deps.dom.metronomeBpm.value;
  }

  function getClampedBpmFromInput() {
    const parsed = Number.parseInt(deps.dom.metronomeBpm.value, 10);
    const clamped = deps.clampMetronomeBpm(parsed);
    deps.dom.metronomeBpm.value = String(clamped);
    syncBpmDisplay();
    return clamped;
  }

  function resetVisualIndicator() {
    deps.dom.metronomeBeatLabel.textContent = '-';
    deps.dom.metronomePulse.classList.remove('bg-amber-400', 'bg-amber-200', 'scale-125');
    deps.dom.metronomePulse.classList.add('bg-slate-500');
  }

  async function ensureRhythmModeMetronome() {
    if (deps.dom.trainingMode.value !== 'rhythm') return true;
    const bpm = getClampedBpmFromInput();
    if (deps.dom.metronomeEnabled.checked) return true;

    try {
      deps.dom.metronomeEnabled.checked = true;
      await deps.startMetronome(bpm);
      return true;
    } catch (error) {
      deps.dom.metronomeEnabled.checked = false;
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to start metronome for Rhythm mode', error));
      return false;
    }
  }

  function registerBeatIndicator() {
    deps.subscribeMetronomeBeat(({ beatInBar, accented }) => {
      deps.dom.metronomeBeatLabel.textContent = String(beatInBar);
      deps.dom.metronomePulse.classList.remove('bg-slate-500');
      deps.dom.metronomePulse.classList.toggle('bg-amber-400', accented);
      deps.dom.metronomePulse.classList.toggle('bg-amber-200', !accented);
      deps.dom.metronomePulse.classList.add('scale-125');

      window.setTimeout(() => {
        deps.dom.metronomePulse.classList.remove('bg-amber-400', 'bg-amber-200', 'scale-125');
        deps.dom.metronomePulse.classList.add('bg-slate-500');
      }, 90);
    });
  }

  async function handleEnabledChange() {
    const bpm = getClampedBpmFromInput();
    deps.saveSettings();
    if (!deps.dom.metronomeEnabled.checked) {
      deps.stopMetronome();
      resetVisualIndicator();
      return;
    }

    try {
      await deps.startMetronome(bpm);
    } catch (error) {
      deps.dom.metronomeEnabled.checked = false;
      resetVisualIndicator();
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to start metronome', error));
    }
  }

  async function handleBpmInput() {
    const bpm = getClampedBpmFromInput();
    deps.saveSettings();
    if (!deps.dom.metronomeEnabled.checked) return;

    try {
      await deps.setMetronomeTempo(bpm);
    } catch {
      // Keep silent to preserve current behavior.
    }
  }

  return {
    syncBpmDisplay,
    getClampedBpmFromInput,
    resetVisualIndicator,
    ensureRhythmModeMetronome,
    registerBeatIndicator,
    handleEnabledChange,
    handleBpmInput,
  };
}
