import { describe, expect, it, vi } from 'vitest';
import { instruments } from './instruments';
import { createSessionPromptRuntimeController } from './session-prompt-runtime-controller';

const melodyLibraryMocks = vi.hoisted(() => ({
  getMelodyById: vi.fn((melodyId: string) => {
    if (melodyId !== 'builtin:guitar:ode_to_joy_intro') return null;
    return {
      id: 'builtin:guitar:ode_to_joy_intro',
      name: 'Ode to Joy Intro',
      source: 'builtin' as const,
      instrumentName: 'guitar' as const,
      events: Array.from({ length: 24 }, () => ({
        durationBeats: 1,
        notes: [{ note: 'E4', stringName: 'e', fret: 0 }],
      })),
    };
  }),
}));

vi.mock('./melody-library', () => ({
  getMelodyById: melodyLibraryMocks.getMelodyById,
}));

function createDomState() {
  return {
    dom: {
      trainingMode: { value: 'performance' },
      melodySelector: { value: 'builtin:guitar:ode_to_joy_intro' },
      sessionGoal: { value: 'correct_10' },
      stringSelector: {} as never,
    },
    state: {
      activeSessionStats: { correctAttempts: 3 },
      melodyTimelinePreviewIndex: null,
      melodyTimelinePreviewLabel: null,
      currentPrompt: {
        displayText: 'Find note C',
        targetNote: 'C',
        targetString: null,
        targetChordNotes: [],
        targetChordFingering: [],
        baseChordName: null,
      },
      autoPlayPromptSound: true,
      currentInstrument: instruments.guitar,
      calibratedA4: 440,
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 2,
      melodyStudyRangeEndIndex: 5,
      targetFrequency: null,
    },
  };
}

describe('createSessionPromptRuntimeController', () => {
  it('updates session goal progress from active stats', () => {
    const ctx = createDomState();
    const setSessionGoalProgress = vi.fn();
    const controller = createSessionPromptRuntimeController({
      dom: ctx.dom,
      state: ctx.state,
      getEnabledStrings: vi.fn(() => new Set(ctx.state.currentInstrument.STRING_ORDER)),
      redrawFretboard: vi.fn(),
      scheduleTimelineRender: vi.fn(),
      setSessionGoalProgress,
      setPlaySoundDisabled: vi.fn(),
      playSound: vi.fn(),
    });

    controller.updateSessionGoalProgress();

    expect(setSessionGoalProgress).toHaveBeenCalledWith('Goal progress: 3 / 10 correct');
  });

  it('applies and clears initial timeline preview', () => {
    const ctx = createDomState();
    const redrawFretboard = vi.fn();
    const scheduleTimelineRender = vi.fn();
    const controller = createSessionPromptRuntimeController({
      dom: ctx.dom,
      state: ctx.state,
      getEnabledStrings: vi.fn(() => new Set(ctx.state.currentInstrument.STRING_ORDER)),
      redrawFretboard,
      scheduleTimelineRender,
      setSessionGoalProgress: vi.fn(),
      setPlaySoundDisabled: vi.fn(),
      playSound: vi.fn(),
    });

    controller.applyInitialTimelinePreview('Get ready');

    expect(ctx.state.melodyTimelinePreviewIndex).toBe(2);
    expect(ctx.state.melodyTimelinePreviewLabel).toBe('Get ready');
    expect(redrawFretboard).toHaveBeenCalledTimes(1);
    expect(scheduleTimelineRender).toHaveBeenCalledTimes(1);

    controller.clearInitialTimelinePreview();

    expect(ctx.state.melodyTimelinePreviewIndex).toBeNull();
    expect(ctx.state.melodyTimelinePreviewLabel).toBeNull();
    expect(redrawFretboard).toHaveBeenCalledTimes(2);
    expect(scheduleTimelineRender).toHaveBeenCalledTimes(2);
  });

  it('configures prompt audio and updates target frequency', () => {
    const ctx = createDomState();
    const setPlaySoundDisabled = vi.fn();
    const playSound = vi.fn();
    const controller = createSessionPromptRuntimeController({
      dom: ctx.dom,
      state: ctx.state,
      getEnabledStrings: vi.fn(() => new Set(ctx.state.currentInstrument.STRING_ORDER)),
      redrawFretboard: vi.fn(),
      scheduleTimelineRender: vi.fn(),
      setSessionGoalProgress: vi.fn(),
      setPlaySoundDisabled,
      playSound,
    });

    controller.configurePromptAudio();

    expect(ctx.state.targetFrequency).toBeGreaterThan(0);
    expect(setPlaySoundDisabled).toHaveBeenCalledWith(false);
    expect(playSound).toHaveBeenCalledTimes(1);
  });
});
