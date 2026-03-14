import { describe, expect, it, vi } from 'vitest';
import { createSessionCurriculumPresetCluster } from './cluster';

function createDeps() {
  return {
    curriculumPreset: {
      dom: {} as never,
      state: {} as never,
      getClampedMetronomeBpmFromInput: vi.fn(() => 120),
      applyEnabledStrings: vi.fn(),
      handleModeChange: vi.fn(),
      redrawFretboard: vi.fn(),
      saveSettings: vi.fn(),
      setResultMessage: vi.fn(),
      isListening: vi.fn(() => false),
      stopListening: vi.fn(),
    },
  };
}

describe('session-curriculum-preset-cluster', () => {
  it('creates the curriculum preset controller and bridge as one cluster', () => {
    const cluster = createSessionCurriculumPresetCluster(createDeps() as never);

    expect(cluster.curriculumPresetController).toBeTruthy();
    expect(cluster.curriculumPresetBridgeController).toBeTruthy();
  });
});
