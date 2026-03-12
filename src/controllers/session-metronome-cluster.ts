import { createMetronomeController } from './metronome-controller';
import { createMetronomeRuntimeBridgeController } from './metronome-runtime-bridge-controller';
import { createMelodyTempoController } from './melody-tempo-controller';
import { createMetronomeBridgeController } from './metronome-bridge-controller';
import { createMetronomeControlsController } from './metronome-controls-controller';

interface SessionMetronomeClusterDeps {
  metronome: Parameters<typeof createMetronomeController>[0];
  melodyTempo: Omit<
    Parameters<typeof createMelodyTempoController>[0],
    'getClampedMetronomeBpmFromInput' | 'resetMetronomeVisualIndicator'
  >;
  metronomeBridge: {
    dom: Parameters<typeof createMetronomeBridgeController>[0]['dom'];
    clampMetronomeVolumePercent: Parameters<typeof createMetronomeBridgeController>[0]['clampMetronomeVolumePercent'];
    setMetronomeVolume: Parameters<typeof createMetronomeBridgeController>[0]['setMetronomeVolume'];
  };
  metronomeControls: {
    dom: Parameters<typeof createMetronomeControlsController>[0]['dom'];
    saveSettings: Parameters<typeof createMetronomeControlsController>[0]['saveSettings'];
  };
}

export function createSessionMetronomeCluster(deps: SessionMetronomeClusterDeps) {
  const metronomeController = createMetronomeController(deps.metronome);
  const metronomeRuntimeBridgeController = createMetronomeRuntimeBridgeController({
    syncBpmDisplay: () => metronomeController.syncBpmDisplay(),
    getClampedBpmFromInput: () => metronomeController.getClampedBpmFromInput(),
    resetVisualIndicator: () => metronomeController.resetVisualIndicator(),
  });
  const melodyTempoController = createMelodyTempoController({
    ...deps.melodyTempo,
    getClampedMetronomeBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
    resetMetronomeVisualIndicator: () => metronomeRuntimeBridgeController.resetVisualIndicator(),
  });
  const metronomeBridgeController = createMetronomeBridgeController({
    dom: deps.metronomeBridge.dom,
    metronomeRuntime: {
      syncBpmDisplay: () => metronomeRuntimeBridgeController.syncBpmDisplay(),
      getClampedBpmFromInput: () => metronomeRuntimeBridgeController.getClampedBpmFromInput(),
      resetVisualIndicator: () => metronomeRuntimeBridgeController.resetVisualIndicator(),
    },
    melodyTempo: {
      syncMelodyTempoFromMetronomeIfLinked: () => melodyTempoController.syncMelodyTempoFromMetronomeIfLinked(),
      hydrateMelodyTempoForSelectedMelody: () => melodyTempoController.hydrateMelodyTempoForSelectedMelody(),
      persistSelectedMelodyTempoOverride: () => melodyTempoController.persistSelectedMelodyTempoOverride(),
      syncHiddenMetronomeTempoFromSharedTempo: () => melodyTempoController.syncHiddenMetronomeTempoFromSharedTempo(),
      syncMetronomeTempoFromMelodyIfLinked: () => melodyTempoController.syncMetronomeTempoFromMelodyIfLinked(),
      startMelodyMetronomeIfEnabled: (options) => melodyTempoController.startMelodyMetronomeIfEnabled(options),
      syncMelodyMetronomeRuntime: () => melodyTempoController.syncMelodyMetronomeRuntime(),
      renderMetronomeToggleButton: () => melodyTempoController.renderMetronomeToggleButton(),
      syncMelodyTimelineZoomDisplay: () => melodyTempoController.syncMelodyTimelineZoomDisplay(),
      syncScrollingTabZoomDisplay: () => melodyTempoController.syncScrollingTabZoomDisplay(),
    },
    clampMetronomeVolumePercent: deps.metronomeBridge.clampMetronomeVolumePercent,
    setMetronomeVolume: deps.metronomeBridge.setMetronomeVolume,
  });
  const metronomeControlsController = createMetronomeControlsController({
    dom: deps.metronomeControls.dom,
    syncHiddenMetronomeTempoFromSharedTempo: () => metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
    syncMelodyMetronomeRuntime: () => metronomeBridgeController.syncMelodyMetronomeRuntime(),
    renderMetronomeToggleButton: () => metronomeBridgeController.renderMetronomeToggleButton(),
    saveSettings: deps.metronomeControls.saveSettings,
    syncMelodyTempoFromMetronomeIfLinked: () => metronomeBridgeController.syncMelodyTempoFromMetronomeIfLinked(),
    syncMetronomeVolumeDisplayAndRuntime: () => metronomeBridgeController.syncMetronomeVolumeDisplayAndRuntime(),
  });

  return {
    metronomeController,
    metronomeRuntimeBridgeController,
    melodyTempoController,
    metronomeBridgeController,
    metronomeControlsController,
  };
}
