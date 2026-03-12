import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRhythmModeRuntimeController } from './rhythm-mode-runtime-controller';

function createDeps() {
  const state = {
    rhythmLastJudgedBeatAtMs: null as number | null,
    activeSessionStats: { attempts: [] },
  };
  const timing = {
    beatAtMs: 1000,
    signedOffsetMs: -12,
    absOffsetMs: 12,
    tone: 'success' as const,
  };
  const deps = {
    dom: {
      rhythmTimingWindow: { value: 'tight' } as HTMLSelectElement,
    },
    state,
    now: vi.fn(() => 1020),
    getMetronomeTimingSnapshot: vi.fn(() => ({ now: 1020 })),
    evaluateRhythmTiming: vi.fn(() => timing),
    recordRhythmTimingAttempt: vi.fn(),
    formatRhythmFeedback: vi.fn(() => 'Great timing: E'),
    setResultMessage: vi.fn(),
  };

  return { state, deps, timing };
}

describe('rhythm-mode-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error when click timing is unavailable', () => {
    const { deps } = createDeps();
    deps.evaluateRhythmTiming.mockReturnValue(null);
    const controller = createRhythmModeRuntimeController(deps);

    controller.handleStableNote('E');

    expect(deps.setResultMessage).toHaveBeenCalledWith('Enable Click to practice rhythm timing.', 'error');
    expect(deps.recordRhythmTimingAttempt).not.toHaveBeenCalled();
  });

  it('ignores duplicate judgments on the same beat', () => {
    const { state, deps } = createDeps();
    state.rhythmLastJudgedBeatAtMs = 1000;
    const controller = createRhythmModeRuntimeController(deps);

    controller.handleStableNote('E');

    expect(deps.recordRhythmTimingAttempt).not.toHaveBeenCalled();
    expect(deps.setResultMessage).not.toHaveBeenCalled();
  });

  it('records a rhythm attempt and reports formatted feedback', () => {
    const { state, deps } = createDeps();
    const controller = createRhythmModeRuntimeController(deps);

    controller.handleStableNote('E');

    expect(state.rhythmLastJudgedBeatAtMs).toBe(1000);
    expect(deps.recordRhythmTimingAttempt).toHaveBeenCalledWith(state.activeSessionStats, -12, 12, true);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Great timing: E', 'success');
  });
});
