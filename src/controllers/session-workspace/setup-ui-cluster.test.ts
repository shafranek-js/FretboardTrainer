import { describe, expect, it, vi } from 'vitest';
import { createSessionSetupUiCluster } from './setup-ui-cluster';

function createDeps() {
  return {
    melodySetupUi: {
      dom: {} as never,
      state: {} as never,
      getSelectedMelody: vi.fn(() => null),
      getSelectedMelodyId: vi.fn(() => null),
      listMelodies: vi.fn(() => []),
      getAdjustedMelody: vi.fn(),
      isStringShiftFeasible: vi.fn(() => false),
      isMelodyWorkflowMode: vi.fn(() => false),
      isDemoActive: vi.fn(() => false),
      isCustomMelodyId: vi.fn(() => false),
      isDefaultStudyRange: vi.fn(() => true),
      renderTimeline: vi.fn(),
    },
    practiceSetupSummary: {
      dom: {} as never,
      state: {} as never,
      getEnabledStringsCount: vi.fn(() => 0),
      getSelectedMelody: vi.fn(() => null),
      getStoredMelodyStudyRangeText: vi.fn(() => 'No steps'),
      isMelodyWorkflowMode: vi.fn(() => false),
      formatMelodyTransposeSemitones: vi.fn(() => '+0'),
      formatMelodyStringShift: vi.fn(() => '+0'),
      setPracticeSetupSummary: vi.fn(),
      setSessionToolsSummary: vi.fn(),
      setMelodySetupSummary: vi.fn(),
    },
    practicePresetUi: {
      dom: {} as never,
      state: {} as never,
      hasCompletedOnboarding: vi.fn(() => false),
    },
  };
}

describe('session-setup-ui-cluster', () => {
  it('creates the setup UI controllers as one cluster', () => {
    const cluster = createSessionSetupUiCluster(createDeps() as never);

    expect(cluster.melodySetupUiController).toBeTruthy();
    expect(cluster.practiceSetupSummaryController).toBeTruthy();
    expect(cluster.practicePresetUiController).toBeTruthy();
  });
});
