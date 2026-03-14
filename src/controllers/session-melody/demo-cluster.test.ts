import { describe, expect, it, vi } from 'vitest';
import { createSessionMelodyDemoCluster } from './demo-cluster';

function createDeps() {
  return {
    melodyDemoRuntime: {
      dom: {} as never,
      state: {} as never,
      getSelectedMelodyId: vi.fn(() => null),
      getMelodyById: vi.fn(() => null),
      getStoredMelodyStudyRange: vi.fn(),
      getEnabledStrings: vi.fn(() => new Set()),
      isMelodyWorkflowMode: vi.fn(() => false),
      setResultMessage: vi.fn(),
      setPromptText: vi.fn(),
      syncMelodyLoopRangeDisplay: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
      scheduleTimelineRender: vi.fn(),
      drawFretboard: vi.fn(),
      redrawFretboard: vi.fn(),
      playSound: vi.fn(),
      loadInstrumentSoundfont: vi.fn(),
      stopListening: vi.fn(),
      seekActiveMelodySessionToEvent: vi.fn(() => false),
      getStudyRangeLength: vi.fn(() => 0),
      formatStudyRange: vi.fn(() => ''),
      startMelodyMetronomeIfEnabled: vi.fn(),
      syncMelodyMetronomeRuntime: vi.fn(),
      updateScrollingTabPanelRuntime: vi.fn(),
      getPlaybackActionLabel: vi.fn(() => ''),
      getPlaybackPromptLabel: vi.fn(() => ''),
      getPlaybackCompletedLabel: vi.fn(() => ''),
      requestAnimationFrame: vi.fn(),
    },
    sessionTransportControls: {
      dom: {} as never,
      state: {} as never,
      applyUiWorkflow: vi.fn(),
      saveSettings: vi.fn(),
      getSelectedMelodyId: vi.fn(() => null),
      stopListening: vi.fn(),
      startSessionFromUi: vi.fn(async () => undefined),
      buildPromptAudioPlan: vi.fn(() => ({ notesToPlay: [] })),
      playSound: vi.fn(),
      clearResultMessage: vi.fn(),
      drawHintFretboard: vi.fn(),
      scheduleHintReset: vi.fn(),
      setResultMessage: vi.fn(),
    },
  };
}

describe('session-melody-demo-cluster', () => {
  it('creates melody demo runtime and session transport controls as one cluster', () => {
    const cluster = createSessionMelodyDemoCluster(createDeps() as never);

    expect(cluster.melodyDemoRuntimeController).toBeTruthy();
    expect(cluster.sessionTransportControlsController).toBeTruthy();
  });
});
