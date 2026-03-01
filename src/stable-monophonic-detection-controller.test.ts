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
        currentPrompt: createPrompt({ targetNote: 'A' }),
      },
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('A', 440);

    expect(deps.performanceResolveSuccess).toHaveBeenCalledWith(2);
    expect(deps.displayResult).not.toHaveBeenCalled();
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

  it('records and highlights octave mismatches with cooldown redraw when target fretboard is visible', () => {
    const deps = createDeps({
      detectMonophonicOctaveMismatch: vi.fn(() => ({
        detectedScientific: 'C3',
        targetScientific: 'C4',
      })),
    });
    const controller = createStableMonophonicDetectionController(deps);

    controller.handleDetectedNote('C', 130.81);

    expect(deps.recordSessionAttempt).toHaveBeenCalled();
    expect(deps.setWrongDetectedHighlight).toHaveBeenCalledWith('C', 130.81);
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
      'monophonic octave mismatch redraw',
      1500,
      expect.any(Function)
    );
  });

  it('records ordinary monophonic mismatches and schedules redraw with wrong-note highlight', () => {
    const deps = createDeps();
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
