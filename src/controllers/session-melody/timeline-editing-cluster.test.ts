import { describe, expect, it, vi } from 'vitest';
import { createSessionMelodyTimelineEditingCluster } from './timeline-editing-cluster';

function createDeps() {
  return {
    melodyTimelineEditingOrchestrator: {
      getSelectedMelody: vi.fn(() => null),
      getCurrentInstrument: vi.fn(() => ({ STRING_ORDER: [] })),
      getTimelineSelection: vi.fn(() => ({ eventIndex: null, noteIndex: null })),
      setTimelineSelection: vi.fn(),
      getMelodyTransposeSemitones: vi.fn(() => 0),
      getMelodyStringShift: vi.fn(() => 0),
      getTrainingMode: vi.fn(() => 'practice'),
      getUiWorkflow: vi.fn(() => 'editor'),
      isMelodyWorkflowMode: vi.fn(() => true),
      updateCustomEventMelody: vi.fn(() => null),
      clearPracticeAdjustmentCaches: vi.fn(),
      renderTimeline: vi.fn(),
      redrawFretboard: vi.fn(),
    },
  };
}

describe('session-melody-timeline-editing-cluster', () => {
  it('creates the timeline editing orchestrator and bridge as one cluster', () => {
    const cluster = createSessionMelodyTimelineEditingCluster(createDeps() as never);

    expect(cluster.melodyTimelineEditingOrchestrator).toBeTruthy();
    expect(cluster.melodyTimelineEditingBridgeController).toBeTruthy();
  });
});
