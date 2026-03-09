interface MetronomeControlsControllerDom {
  metronomeToggleBtn: HTMLButtonElement;
  metronomeEnabled: HTMLInputElement;
  metronomeBpm: HTMLInputElement;
  metronomeVolume: HTMLInputElement;
}

export interface MetronomeControlsControllerDeps {
  dom: MetronomeControlsControllerDom;
  syncHiddenMetronomeTempoFromSharedTempo: () => void;
  syncMelodyMetronomeRuntime: () => Promise<void>;
  renderMetronomeToggleButton: () => void;
  saveSettings: () => void;
  syncMelodyTempoFromMetronomeIfLinked: () => Promise<void>;
  syncMetronomeVolumeDisplayAndRuntime: () => void;
}

export function createMetronomeControlsController(deps: MetronomeControlsControllerDeps) {
  async function syncEnabledState() {
    deps.syncHiddenMetronomeTempoFromSharedTempo();
    await deps.syncMelodyMetronomeRuntime();
    deps.renderMetronomeToggleButton();
    deps.saveSettings();
  }

  async function syncTempo() {
    await deps.syncMelodyTempoFromMetronomeIfLinked();
    deps.saveSettings();
  }

  function syncVolume() {
    deps.syncMetronomeVolumeDisplayAndRuntime();
    deps.saveSettings();
  }

  function register() {
    deps.dom.metronomeToggleBtn.addEventListener('click', async () => {
      deps.dom.metronomeEnabled.checked = !deps.dom.metronomeEnabled.checked;
      await syncEnabledState();
    });

    deps.dom.metronomeEnabled.addEventListener('change', async () => {
      await syncEnabledState();
    });

    deps.dom.metronomeBpm.addEventListener('input', async () => {
      await syncTempo();
    });

    deps.dom.metronomeBpm.addEventListener('change', async () => {
      await syncTempo();
    });

    deps.dom.metronomeVolume.addEventListener('input', () => {
      syncVolume();
    });

    deps.dom.metronomeVolume.addEventListener('change', () => {
      syncVolume();
    });
  }

  return {
    register,
  };
}
