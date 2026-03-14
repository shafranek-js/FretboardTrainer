import { describe, expect, it, vi } from 'vitest';
import { createSessionMelodySettingsCluster } from './settings-cluster';

function createDeps() {
  return {
    selectedMelodyContext: {
      dom: {} as never,
      state: {} as never,
      getMelodyById: vi.fn(() => null),
      isMelodyWorkflowMode: vi.fn(() => false),
      defaultMeterProfile: {
        beatsPerBar: 4,
        beatUnitDenominator: 4,
        secondaryAccentBeatIndices: [],
      },
      resolveMelodyMetronomeMeterProfile: vi.fn(() => null),
      setMetronomeMeter: vi.fn(),
    },
    melodyPracticeSettings: {
      dom: {} as never,
      state: {} as never,
      clearPreviewState: vi.fn(),
      renderTimeline: vi.fn(),
    },
    melodyPracticeSettingsBridge: {},
  };
}

describe('session-melody-settings-cluster', () => {
  it('creates the selected-melody and practice-settings controllers as one cluster', () => {
    const cluster = createSessionMelodySettingsCluster(createDeps() as never);

    expect(cluster.selectedMelodyContextController).toBeTruthy();
    expect(cluster.melodyPracticeSettingsController).toBeTruthy();
    expect(cluster.melodyPracticeSettingsBridgeController).toBeTruthy();
  });
});
