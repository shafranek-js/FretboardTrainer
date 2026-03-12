import { describe, expect, it, vi } from 'vitest';
import { createSessionMetronomeCluster } from './session-metronome-cluster';

function createDeps() {
  return {
    metronome: {
      dom: {
        trainingMode: {} as never,
        metronomeEnabled: {} as never,
        metronomeBpm: {} as never,
        metronomeBpmValue: {} as never,
        metronomeBeatLabel: {} as never,
        metronomePulse: {} as never,
      },
      clampMetronomeBpm: vi.fn(),
      startMetronome: vi.fn(),
      stopMetronome: vi.fn(),
      setMetronomeTempo: vi.fn(),
      subscribeMetronomeBeat: vi.fn(),
      saveSettings: vi.fn(),
      formatUserFacingError: vi.fn(),
      showNonBlockingError: vi.fn(),
    },
    melodyTempo: {
      dom: {
        trainingMode: {} as never,
        metronomeEnabled: {} as never,
        metronomeBpm: {} as never,
        metronomeBpmValue: {} as never,
        metronomeToggleBtn: {} as never,
        melodyDemoBpm: {} as never,
        melodyTimelineZoom: {} as never,
        melodyTimelineZoomValue: {} as never,
        scrollingTabZoom: {} as never,
        scrollingTabZoomValue: {} as never,
      },
      state: {} as never,
      getSelectedMelody: vi.fn(),
      syncMelodyDemoBpmDisplay: vi.fn(),
      syncMetronomeMeterFromSelectedMelody: vi.fn(),
      startMetronome: vi.fn(),
      stopMetronome: vi.fn(),
      setMetronomeTempo: vi.fn(),
      isMetronomeRunning: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(),
      isMelodyDemoPlaying: vi.fn(),
      isMelodyWorkflowMode: vi.fn(),
      isPerformanceStyleMode: vi.fn(),
    },
    metronomeBridge: {
      dom: {
        metronomeVolume: {} as never,
        metronomeVolumeValue: {} as never,
      },
      clampMetronomeVolumePercent: vi.fn(),
      setMetronomeVolume: vi.fn(),
    },
    metronomeControls: {
      dom: {
        metronomeToggleBtn: {} as never,
        metronomeEnabled: {} as never,
        metronomeBpm: {} as never,
        metronomeVolume: {} as never,
      },
      saveSettings: vi.fn(),
    },
  };
}

describe('session-metronome-cluster', () => {
  it('creates the metronome-related controller chain as one cluster', () => {
    const cluster = createSessionMetronomeCluster(createDeps() as never);

    expect(cluster.metronomeController).toBeTruthy();
    expect(cluster.metronomeRuntimeBridgeController).toBeTruthy();
    expect(cluster.melodyTempoController).toBeTruthy();
    expect(cluster.metronomeBridgeController).toBeTruthy();
    expect(cluster.metronomeControlsController).toBeTruthy();
  });
});
