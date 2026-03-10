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
  subscribeMetronomeBeat(
    handler: (payload: {
      beatInBar: number;
      beatIndex: number;
      timestampMs: number;
      accented: boolean;
      secondaryAccented?: boolean;
    }) => void
  ): void;
  saveSettings(): void;
  formatUserFacingError(prefix: string, error: unknown): string;
  showNonBlockingError(message: string): void;
}

export function createMetronomeController(deps: MetronomeControllerDeps) {
  let pulseResetTimerId: number | null = null;
  let pulseAnimationFrameId: number | null = null;

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
    if (pulseResetTimerId !== null) {
      clearTimeout(pulseResetTimerId);
      pulseResetTimerId = null;
    }
    if (pulseAnimationFrameId !== null) {
      cancelAnimationFrame(pulseAnimationFrameId);
      pulseAnimationFrameId = null;
    }
    deps.dom.metronomeBeatLabel.textContent = '-';
    deps.dom.metronomePulse.classList.remove(
      'bg-amber-400',
      'bg-amber-300',
      'bg-amber-200',
      'scale-125'
    );
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

  function applyBeatIndicator(beatInBar: number, accented: boolean, secondaryAccented?: boolean) {
    deps.dom.metronomeBeatLabel.textContent = String(beatInBar);
    deps.dom.metronomePulse.classList.remove('bg-slate-500');
    deps.dom.metronomePulse.classList.toggle('bg-amber-400', accented);
    deps.dom.metronomePulse.classList.toggle('bg-amber-300', !accented && Boolean(secondaryAccented));
    deps.dom.metronomePulse.classList.toggle('bg-amber-200', !accented && !secondaryAccented);
    deps.dom.metronomePulse.classList.add('scale-125');

    if (pulseResetTimerId !== null) {
      clearTimeout(pulseResetTimerId);
    }
    pulseResetTimerId = window.setTimeout(() => {
      pulseResetTimerId = null;
      deps.dom.metronomePulse.classList.remove(
        'bg-amber-400',
        'bg-amber-300',
        'bg-amber-200',
        'scale-125'
      );
      deps.dom.metronomePulse.classList.add('bg-slate-500');
    }, 90);
  }

  function registerBeatIndicator() {
    deps.subscribeMetronomeBeat(({ beatInBar, timestampMs, accented, secondaryAccented }) => {
      const renderBeatIndicator = () => {
        pulseAnimationFrameId = null;
        applyBeatIndicator(beatInBar, accented, secondaryAccented);
      };
      const waitForBeatFrame = () => {
        if (performance.now() + 2 >= timestampMs) {
          renderBeatIndicator();
          return;
        }
        pulseAnimationFrameId = window.requestAnimationFrame(waitForBeatFrame);
      };

      if (pulseAnimationFrameId !== null) {
        cancelAnimationFrame(pulseAnimationFrameId);
        pulseAnimationFrameId = null;
      }
      if (performance.now() + 2 >= timestampMs) {
        renderBeatIndicator();
        return;
      }
      pulseAnimationFrameId = window.requestAnimationFrame(waitForBeatFrame);
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
