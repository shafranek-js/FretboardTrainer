import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prompt } from './types';
import { createSessionNextPromptRuntimeController } from './session-next-prompt-runtime-controller';

function createPrompt(overrides?: Partial<Prompt>): Prompt {
  return {
    displayText: 'Find: E',
    targetNote: 'E',
    targetString: 'A',
    targetChordNotes: [],
    targetChordFingering: [],
    targetMelodyEventNotes: [],
    baseChordName: null,
    melodyEventDurationMs: 240,
    ...overrides,
  };
}

function createState(overrides = {}) {
  return {
    isListening: true,
    performanceRuntimeStartedAtMs: 1000,
    performancePrerollLeadInVisible: false,
    pendingSessionStopResultMessage: null as { text: string; tone: 'neutral' | 'success' | 'error' } | null,
    liveDetectedNote: 'C4',
    liveDetectedString: 'A',
    wrongDetectedNote: 'D4',
    wrongDetectedString: 'D',
    wrongDetectedFret: 3,
    rhythmLastJudgedBeatAtMs: 999,
    currentMelodyEventFoundNotes: new Set(['E4']),
    currentPrompt: createPrompt({ displayText: 'Old prompt' }),
    startTime: 0,
    ...overrides,
  };
}

function createDeps(options?: { trainingMode?: string; prompt?: Prompt | null; executorResult?: 'stopped' | 'no_prompt' | 'prompt_applied' }) {
  const state = createState();
  const prompt = options?.prompt ?? createPrompt();
  const deps = {
    state,
    getTrainingMode: vi.fn(() => options?.trainingMode ?? 'random'),
    isPerformanceStyleMode: vi.fn((trainingMode: string) => trainingMode === 'performance' || trainingMode === 'practice'),
    startRuntimeClock: vi.fn(),
    clearResultMessage: vi.fn(),
    resetAttackTracking: vi.fn(),
    resetPromptCycleTracking: vi.fn(),
    getMode: vi.fn((trainingMode: string) =>
      trainingMode === 'random'
        ? { detectionType: 'monophonic', generatePrompt: vi.fn(() => prompt) }
        : { detectionType: 'monophonic', generatePrompt: vi.fn(() => null) }
    ),
    syncPromptEventFromRuntime: vi.fn(() => ({
      context: {
        melody: { id: 'm1', name: 'Melody', events: [] },
        studyRange: { startIndex: 2, endIndex: 6 },
        bpm: 90,
      },
      activeEventIndex: 4,
    })),
    buildPerformancePromptForEvent: vi.fn(() => prompt),
    buildSessionNextPromptPlan: vi.fn(() => ({
      shouldStopListening: false,
      stopReason: null,
      errorMessage: null,
      tunerVisible: true,
      shouldResetTuner: false,
    })),
    executeSessionNextPromptPlan: vi.fn((plan, nextPrompt, executorDeps) => {
      if ((options?.executorResult ?? 'prompt_applied') === 'prompt_applied' && nextPrompt) {
        executorDeps.applyPrompt(nextPrompt);
      }
      return options?.executorResult ?? 'prompt_applied';
    }),
    requestSessionSummaryOnStop: vi.fn(),
    stopListening: vi.fn(),
    showError: vi.fn(),
    updateTuner: vi.fn(),
    setTunerVisible: vi.fn(),
    syncPromptTransition: vi.fn(),
    setPromptText: vi.fn(),
    redrawFretboard: vi.fn(),
    scheduleTimelineRender: vi.fn(),
    configurePromptAudio: vi.fn(),
    syncMetronomeToPromptStart: vi.fn(async () => {}),
    schedulePerformancePromptAdvance: vi.fn(),
    setResultMessage: vi.fn(),
    now: vi.fn(() => 4321),
  };

  return { state, deps, prompt };
}

describe('session-next-prompt-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies a non-performance prompt and resets transient prompt state', () => {
    const { state, deps, prompt } = createDeps({ trainingMode: 'random' });
    const controller = createSessionNextPromptRuntimeController(deps);

    controller.advance();

    expect(deps.clearResultMessage).toHaveBeenCalledTimes(1);
    expect(state.liveDetectedNote).toBeNull();
    expect(state.liveDetectedString).toBeNull();
    expect(state.wrongDetectedNote).toBeNull();
    expect(state.wrongDetectedString).toBeNull();
    expect(state.wrongDetectedFret).toBeNull();
    expect(state.rhythmLastJudgedBeatAtMs).toBeNull();
    expect(state.currentMelodyEventFoundNotes.size).toBe(0);
    expect(deps.resetAttackTracking).toHaveBeenCalledTimes(1);
    expect(deps.resetPromptCycleTracking).toHaveBeenCalledTimes(1);
    expect(deps.buildSessionNextPromptPlan).toHaveBeenCalledWith({
      hasMode: true,
      detectionType: 'monophonic',
      hasPrompt: true,
    });
    expect(deps.syncPromptTransition).toHaveBeenCalledWith(expect.objectContaining({ displayText: 'Old prompt' }), prompt);
    expect(state.currentPrompt).toBe(prompt);
    expect(deps.setPromptText).toHaveBeenCalledWith('Find: E');
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.scheduleTimelineRender).toHaveBeenCalledTimes(1);
    expect(deps.configurePromptAudio).toHaveBeenCalledTimes(1);
    expect(state.startTime).toBe(4321);
    expect(deps.syncMetronomeToPromptStart).toHaveBeenCalledTimes(1);
    expect(deps.schedulePerformancePromptAdvance).toHaveBeenCalledTimes(1);
    expect(deps.startRuntimeClock).not.toHaveBeenCalled();
  });

  it('resolves performance prompts from transport runtime and starts clock when needed', () => {
    const { deps } = createDeps({ trainingMode: 'performance' });
    deps.state.performanceRuntimeStartedAtMs = null;
    const controller = createSessionNextPromptRuntimeController(deps);

    controller.advance();

    expect(deps.startRuntimeClock).toHaveBeenCalledTimes(1);
    expect(deps.syncPromptEventFromRuntime).toHaveBeenCalledTimes(1);
    expect(deps.buildPerformancePromptForEvent).toHaveBeenCalledWith({
      melody: expect.objectContaining({ id: 'm1' }),
      studyRange: { startIndex: 2, endIndex: 6 },
      eventIndex: 4,
      bpm: 90,
    });
    expect(deps.schedulePerformancePromptAdvance).not.toHaveBeenCalled();
  });

  it('restores pending stop result message after a stop outcome', () => {
    const { state, deps } = createDeps({ trainingMode: 'performance', executorResult: 'stopped', prompt: null });
    state.pendingSessionStopResultMessage = { text: 'Performance complete!', tone: 'success' };
    const controller = createSessionNextPromptRuntimeController(deps);

    controller.advance();

    expect(deps.setResultMessage).toHaveBeenCalledWith('Performance complete!', 'success');
    expect(state.pendingSessionStopResultMessage).toBeNull();
  });
});
