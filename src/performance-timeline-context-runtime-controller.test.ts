import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPerformanceTimelineContextRuntimeController } from './performance-timeline-context-runtime-controller';

function createDeps() {
  const deps = {
    dom: {
      trainingMode: { value: 'performance' } as HTMLSelectElement,
    },
    state: {
      performanceActiveEventIndex: 4,
      currentMelodyId: 'm1',
      currentInstrument: { name: 'guitar' },
      melodyTransposeSemitones: 2,
      melodyStringShift: -1,
    },
    isPerformanceStyleMode: vi.fn((trainingMode: string) => trainingMode === 'performance'),
    buildPerformanceTimelineFeedbackKey: vi.fn(() => 'm1:guitar:2:-1'),
  };

  return { deps };
}

describe('performance-timeline-context-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the active event index only in performance mode', () => {
    const { deps } = createDeps();
    const controller = createPerformanceTimelineContextRuntimeController(deps);

    expect(controller.getCurrentEventIndex()).toBe(4);
    deps.dom.trainingMode.value = 'random';
    expect(controller.getCurrentEventIndex()).toBeNull();
  });

  it('builds the feedback key from current melody context', () => {
    const { deps } = createDeps();
    const controller = createPerformanceTimelineContextRuntimeController(deps);

    expect(controller.getFeedbackKey()).toBe('m1:guitar:2:-1');
    expect(deps.buildPerformanceTimelineFeedbackKey).toHaveBeenCalledWith({
      melodyId: 'm1',
      instrumentName: 'guitar',
      melodyTransposeSemitones: 2,
      melodyStringShift: -1,
    });
  });
});
