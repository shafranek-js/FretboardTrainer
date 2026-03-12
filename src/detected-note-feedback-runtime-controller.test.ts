import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDetectedNoteFeedbackRuntimeController } from './detected-note-feedback-runtime-controller';

function createInstrument() {
  return {
    STRING_ORDER: ['A', 'D'],
    FRETBOARD: {
      A: { C: 3, D: 5 },
      D: { C: 10, D: 0 },
    },
    getNoteWithOctave: vi.fn((stringName: string, fret: number) => {
      const notes: Record<string, Record<number, string>> = {
        A: { 3: 'C3', 5: 'D3' },
        D: { 0: 'D3', 10: 'C4' },
      };
      return notes[stringName]?.[fret] ?? null;
    }),
  };
}

function createDeps() {
  const state = {
    wrongDetectedNote: 'D',
    wrongDetectedString: 'A',
    wrongDetectedFret: 5,
    currentInstrument: createInstrument(),
    inputSource: 'microphone' as const,
    relaxPerformanceOctaveCheck: false,
    currentPrompt: {
      displayText: 'Find C',
      targetNote: 'C',
      targetString: 'A',
      targetChordNotes: [],
      targetChordFingering: [],
      targetMelodyEventNotes: [],
      baseChordName: null,
    },
    targetFrequency: 200,
  };
  const deps = {
    dom: {
      trainingMode: { value: 'random' } as HTMLSelectElement,
      stringSelector: {} as HTMLSelectElement,
    },
    state,
    getEnabledStrings: vi.fn(() => new Set(['A', 'D'])),
    redrawFretboard: vi.fn(),
    freqToScientificNoteName: vi.fn((frequency: number) => (frequency > 300 ? 'C4' : 'C3')),
    shouldIgnorePerformanceOctaveMismatch: vi.fn(() => false),
  };

  return { state, deps };
}

describe('detected-note-feedback-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears wrong-note highlight state and redraws only when requested', () => {
    const { state, deps } = createDeps();
    const controller = createDetectedNoteFeedbackRuntimeController(deps);

    controller.clearWrongDetectedHighlight(true);

    expect(state.wrongDetectedNote).toBeNull();
    expect(state.wrongDetectedString).toBeNull();
    expect(state.wrongDetectedFret).toBeNull();
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
  });

  it('sets wrong-note highlight from enabled strings and detected frequency', () => {
    const { state, deps } = createDeps();
    state.wrongDetectedNote = null;
    state.wrongDetectedString = null;
    state.wrongDetectedFret = null;
    const controller = createDetectedNoteFeedbackRuntimeController(deps);

    controller.setWrongDetectedHighlight('C', 330);

    expect(deps.getEnabledStrings).toHaveBeenCalledTimes(1);
    expect(state.wrongDetectedNote).toBe('C');
    expect(state.wrongDetectedString).toBe('D');
    expect(state.wrongDetectedFret).toBe(10);
  });

  it('detects octave mismatch unless the policy says to ignore it', () => {
    const { deps } = createDeps();
    const controller = createDetectedNoteFeedbackRuntimeController(deps);

    expect(controller.detectMonophonicOctaveMismatch('C', 330)).toEqual({
      detectedScientific: 'C4',
      targetScientific: 'C3',
    });

    deps.shouldIgnorePerformanceOctaveMismatch.mockReturnValue(true);
    expect(controller.detectMonophonicOctaveMismatch('C', 330)).toBeNull();
  });

  it('skips octave mismatch checks in melody mode', () => {
    const { deps } = createDeps();
    deps.dom.trainingMode.value = 'melody';
    const controller = createDetectedNoteFeedbackRuntimeController(deps);

    expect(controller.detectMonophonicOctaveMismatch('C', 330)).toBeNull();
    expect(deps.shouldIgnorePerformanceOctaveMismatch).not.toHaveBeenCalled();
  });
});
