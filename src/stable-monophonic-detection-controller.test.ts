import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStableMonophonicDetectionController } from './stable-monophonic-detection-controller';
import type { Prompt } from './types';

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    displayText: 'Test',
    targetNote: 'C',
    targetString: 'A',
    targetChordNotes: [],
    targetChordFingering: [],
    targetMelodyEventNotes: undefined,
    melodyEventDurationMs: undefined,
    baseChordName: null,
    ...overrides,
  };
}

function createDeps(overrides: Partial<Parameters<typeof createStableMonophonicDetectionController>[0]> = {}) {
  return {
    state: {
      currentPrompt: createPrompt(),
      currentMelodyEventFoundNotes: new Set<string>(),
      performancePromptResolved: false,
      startTime: 0,
      micMonophonicFirstDetectedAtMs: 10,
      performanceMicLastJudgedOnsetNote: null,
      performanceMicLastJudgedOnsetAtMs: null,
      showingAllNotes: false,
      wrongDetectedNote: 'X',
      wrongDetectedString: 'G',
      wrongDetectedFret: 7,
      activeSessionStats: { kind: 'stats' },
      currentInstrument: { name: 'Guitar' },
    },
    getTrainingMode: vi.fn(() => 'melody'),
    clearWrongDetectedHighlight: vi.fn(),
    setWrongDetectedHighlight: vi.fn(),
    recordPerformanceTimelineWrongAttempt: vi.fn(),
    markPerformancePromptAttempt: vi.fn(),
    markPerformanceMicOnsetJudged: vi.fn(),
    recordPerformanceMicJudgmentLatency: vi.fn(),
    isPerformancePitchWithinTolerance: vi.fn(() => false),
    detectMonophonicOctaveMismatch: vi.fn(() => null),
    performanceResolveSuccess: vi.fn(),
    handleMelodyPolyphonicMismatch: vi.fn(),
    displayResult: vi.fn(),
    setResultMessage: vi.fn(),
    redrawFretboard: vi.fn(),
    drawFretboard: vi.fn(),
    scheduleSessionCooldown: vi.fn(),
    recordSessionAttempt: vi.fn(),
    handleRhythmModeStableNote: vi.fn(),
    updateFreePlayLiveHighlight: vi.fn(),
    freqToScientificNoteName: vi.fn((frequency: number) => `C${Math.round(frequency)}`),
    ...overrides,
  };
}

describe('stable-monophonic-detection-controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('routes polyphonic melody mismatches through the dedicated feedback controller', () => {
    const deps = createDeps({
      state: {
        ...createDeps().state,
        currentPrompt: createPrompt({
          targetNote: null,
          targetMelodyEventNotes: [
            { note: 'C', string: 'A', fret: 3 },
            { note: 'E', string: 'D', fret: 2 },
          ],
        }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('G');

    expect(deps.handleMelodyPolyphonicMismatch).toHaveBeenCalledWith(
      expect.objectContaining({ displayText: 'Test' }),
      'G',
      'melody polyphonic mismatch redraw'
    );
  });

  it('tracks partial polyphonic melody progress before resolving success', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1500);
    const deps = createDeps({
      state: {
        ...createDeps().state,
        startTime: 500,
        micMonophonicFirstDetectedAtMs: 1200,
        currentPrompt: createPrompt({
          targetNote: null,
          targetMelodyEventNotes: [
            { note: 'C', string: 'A', fret: 3 },
            { note: 'E', string: 'D', fret: 2 },
          ],
        }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('C');
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Heard: C [1/2] (mic poly mode: play remaining notes one by one)'
    );
    expect(deps.displayResult).not.toHaveBeenCalled();

    controller.handleDetectedNote('E');
    expect(deps.displayResult).toHaveBeenCalledWith(true, 1);
  });

  it('uses performance success flow for matching monophonic performance notes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(2300);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        startTime: 300,
        micMonophonicFirstDetectedAtMs: 2200,
        currentPrompt: createPrompt({ targetNote: 'A' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('A', 440);

    expect(deps.performanceResolveSuccess).toHaveBeenCalledWith(2, expect.any(Object));
    expect(deps.markPerformanceMicOnsetJudged).toHaveBeenCalledWith('A', 2200);
    expect(deps.recordPerformanceMicJudgmentLatency).toHaveBeenCalledWith(2200, 2300);
    expect(deps.displayResult).not.toHaveBeenCalled();
  });

  it('uses performance success flow when microphone pitch is within tolerance', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1600);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      isPerformancePitchWithinTolerance: vi.fn(() => true),
      state: {
        ...createDeps().state,
        startTime: 600,
        micMonophonicFirstDetectedAtMs: 1200,
        currentPrompt: createPrompt({ targetNote: 'A' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('G#', 432);

    expect(deps.performanceResolveSuccess).toHaveBeenCalledWith(1, expect.any(Object));
    expect(deps.markPerformanceMicOnsetJudged).toHaveBeenCalledWith('G#', 1200);
    expect(deps.recordPerformanceMicJudgmentLatency).toHaveBeenCalledWith(1200, 1600);
    expect(deps.recordPerformanceTimelineWrongAttempt).not.toHaveBeenCalled();
  });

  it('applies mic latency compensation in monophonic performance timing grade', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1300);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        inputSource: 'microphone',
        performanceMicLatencyCompensationMs: 100,
        startTime: 1000,
        micMonophonicFirstDetectedAtMs: 1160,
        currentPrompt: createPrompt({ targetNote: 'A' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('A', 440);

    const timingGrade = deps.performanceResolveSuccess.mock.calls[0]?.[1];
    expect(timingGrade?.signedOffsetMs).toBe(60);
    expect(timingGrade?.bucket).toBe('perfect');
  });

  it('applies adaptive timing bias in monophonic performance timing grade', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1300);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        inputSource: 'microphone',
        performanceMicLatencyCompensationMs: 100,
        performanceTimingBiasMs: 80,
        startTime: 1000,
        micMonophonicFirstDetectedAtMs: 1160,
        currentPrompt: createPrompt({ targetNote: 'A' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('A', 440);

    const timingGrade = deps.performanceResolveSuccess.mock.calls[0]?.[1];
    expect(timingGrade?.signedOffsetMs).toBe(-20);
    expect(timingGrade?.bucket).toBe('perfect');
  });

  it('records performance wrong-note attempts for off-target notes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(300);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        startTime: 100,
        micMonophonicFirstDetectedAtMs: 120,
        currentPrompt: createPrompt({ targetNote: 'A' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('G', 196);

    expect(deps.recordPerformanceTimelineWrongAttempt).toHaveBeenCalledWith('G');
    expect(deps.markPerformanceMicOnsetJudged).toHaveBeenCalledWith('G', 120);
    expect(deps.recordPerformanceMicJudgmentLatency).toHaveBeenCalledWith(120, 300);
    expect(deps.redrawFretboard).not.toHaveBeenCalled();
  });

  it('forgives performance off-target notes near prompt boundaries', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1050);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        startTime: 1000,
        currentPrompt: createPrompt({
          targetNote: 'A',
          melodyEventDurationMs: 500,
        }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('G', 196);

    expect(deps.recordPerformanceTimelineWrongAttempt).not.toHaveBeenCalled();
    expect(deps.setResultMessage).not.toHaveBeenCalledWith(expect.stringContaining('[off target]'), 'error');
    expect(deps.redrawFretboard).not.toHaveBeenCalled();
  });

  it('does not redraw the fretboard for performance octave mismatches', () => {
    vi.spyOn(Date, 'now').mockReturnValue(300);
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      detectMonophonicOctaveMismatch: vi.fn(() => ({
        detectedScientific: 'C3',
        targetScientific: 'C4',
      })),
      state: {
        ...createDeps().state,
        startTime: 100,
        micMonophonicFirstDetectedAtMs: 120,
        currentPrompt: createPrompt({ targetNote: 'C' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('C', 130.81);

    expect(deps.recordPerformanceTimelineWrongAttempt).toHaveBeenCalledWith('C');
    expect(deps.markPerformanceMicOnsetJudged).toHaveBeenCalledWith('C', 120);
    expect(deps.recordPerformanceMicJudgmentLatency).toHaveBeenCalledWith(120, 300);
    expect(deps.redrawFretboard).not.toHaveBeenCalled();
  });

  it('ignores repeated frames from the same already-judged onset in performance mode', () => {
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        currentPrompt: createPrompt({ targetNote: 'A' }),
        micMonophonicFirstDetectedAtMs: 20,
        performanceMicLastJudgedOnsetNote: 'A',
        performanceMicLastJudgedOnsetAtMs: 20,
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('A', 440);

    expect(deps.performanceResolveSuccess).not.toHaveBeenCalled();
    expect(deps.recordPerformanceTimelineWrongAttempt).not.toHaveBeenCalled();
    expect(deps.markPerformancePromptAttempt).not.toHaveBeenCalled();
  });

  it('clears wrong-highlight state and updates free-play live highlight', () => {
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'free'),
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('F');

    expect(deps.clearWrongDetectedHighlight).toHaveBeenCalled();
    expect(deps.updateFreePlayLiveHighlight).toHaveBeenCalledWith('F');
  });

    it('accepts non-performance pitch-class matches before octave mismatch fallback', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1500);
    const deps = createDeps({
      state: {
        ...createDeps().state,
        startTime: 500,
        micMonophonicFirstDetectedAtMs: 1200,
      },
      detectMonophonicOctaveMismatch: vi.fn(() => ({
        detectedScientific: 'C3',
        targetScientific: 'C4',
      })),
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('C', 130.81);

    expect(deps.displayResult).toHaveBeenCalledWith(true, 1);
    expect(deps.recordSessionAttempt).not.toHaveBeenCalled();
    expect(deps.setWrongDetectedHighlight).not.toHaveBeenCalled();
    expect(deps.scheduleSessionCooldown).not.toHaveBeenCalled();
  });

  it('records ordinary monophonic mismatches and schedules redraw with wrong-note highlight', () => {
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'random'),
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('G', 196);

    expect(deps.recordSessionAttempt).toHaveBeenCalled();
    expect(deps.setResultMessage).toHaveBeenCalledWith('Heard: C196 [wrong]', 'error');
    expect(deps.setWrongDetectedHighlight).toHaveBeenCalledWith('G', 196);
    expect(deps.drawFretboard).toHaveBeenCalledWith(
      false,
      'C',
      'A',
      [],
      expect.any(Set),
      null,
      'X',
      'G',
      7
    );
    expect(deps.scheduleSessionCooldown).toHaveBeenCalledWith(
      'monophonic mismatch redraw',
      1500,
      expect.any(Function)
    );
  });
});


describe('study melody onset freshness', () => {
  it('ignores stale onsets that started before the current prompt', () => {
    const deps = createDeps({
      state: {
        ...createDeps().state,
        startTime: 1000,
        micMonophonicFirstDetectedAtMs: 900,
        currentPrompt: createPrompt({ targetNote: 'C' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('C', 261.63);

    expect(deps.displayResult).not.toHaveBeenCalled();
    expect(deps.recordSessionAttempt).not.toHaveBeenCalled();
    expect(deps.setResultMessage).not.toHaveBeenCalled();
  });

  it('accepts fresh onsets that started after the current prompt', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1500);
    const deps = createDeps({
      state: {
        ...createDeps().state,
        startTime: 1000,
        micMonophonicFirstDetectedAtMs: 1200,
        currentPrompt: createPrompt({ targetNote: 'C' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('C', 261.63);

    expect(deps.displayResult).toHaveBeenCalledWith(true, 0.5);
  });
});




