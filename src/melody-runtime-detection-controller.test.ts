import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMelodyRuntimeDetectionController } from './melody-runtime-detection-controller';
import type { MidiNoteEvent } from './midi-runtime';
import type { Prompt } from './types';

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    displayText: 'Prompt',
    targetNote: null,
    targetString: null,
    targetChordNotes: [],
    targetChordFingering: [],
    targetMelodyEventNotes: [
      { note: 'C', string: 'A', fret: 3 },
      { note: 'E', string: 'D', fret: 2 },
    ],
    melodyEventDurationMs: undefined,
    baseChordName: null,
    ...overrides,
  };
}

function createMidiEvent(overrides: Partial<MidiNoteEvent> = {}): MidiNoteEvent {
  return {
    kind: 'noteon',
    noteName: 'C',
    noteNumber: 60,
    heldNoteNames: ['C'],
    heldNoteNumbers: [60],
    velocity: 100,
    timestampMs: 0,
    ...overrides,
  };
}

function createDeps(
  overrides: Partial<Parameters<typeof createMelodyRuntimeDetectionController>[0]> = {}
) {
  const frequencyDataArray = new Float32Array(8);
  return {
    state: {
      currentPrompt: createPrompt(),
      analyser: {
        fftSize: 2048,
        getFloatFrequencyData: vi.fn(),
      },
      audioContext: { sampleRate: 44100 },
      frequencyDataArray,
      dataArray: new Float32Array(8),
      calibratedA4: 440,
      lastDetectedChord: '',
      stableChordCounter: 0,
      currentMelodyEventFoundNotes: new Set<string>(),
      performancePromptResolved: false,
      startTime: 0,
      micPolyphonicDetectorProvider: 'spectrum',
    },
    requiredStableFrames: 3,
    getTrainingMode: vi.fn(() => 'melody'),
    detectMicPolyphonicFrame: vi.fn(() => ({
      detectedNotesText: 'C',
      detectedNoteNames: ['C'],
      nextStableChordCounter: 1,
      isStableMatch: false,
      isStableMismatch: false,
    })),
    updateMicPolyphonicDetectorRuntimeStatus: vi.fn(),
    now: vi.fn(() => 1000),
    performanceNow: vi.fn(() => 10),
    redrawFretboard: vi.fn(),
    setResultMessage: vi.fn(),
    performanceResolveSuccess: vi.fn(),
    displayResult: vi.fn(),
    handleMelodyPolyphonicMismatch: vi.fn(),
    handleStableMonophonicDetectedNote: vi.fn(),
    ...overrides,
  };
}

describe('melody-runtime-detection-controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles partial microphone polyphonic melody progress without mismatch noise', () => {
    const deps = createDeps({
      detectMicPolyphonicFrame: vi.fn(() => ({
        detectedNotesText: 'C',
        detectedNoteNames: ['C'],
        nextStableChordCounter: 2,
        isStableMatch: false,
        isStableMismatch: false,
      })),
    });
    const controller = createMelodyRuntimeDetectionController(deps);

    const handled = controller.handleMicrophonePolyphonicMelodyFrame(0.2);

    expect(handled).toBe(true);
    expect(deps.state.currentMelodyEventFoundNotes).toEqual(new Set(['C']));
    expect(deps.redrawFretboard).toHaveBeenCalled();
    expect(deps.setResultMessage).toHaveBeenCalledWith('Heard: C [1/2]');
    expect(deps.handleMelodyPolyphonicMismatch).not.toHaveBeenCalled();
  });

  it('resolves microphone polyphonic performance hits through performance flow', () => {
    const deps = createDeps({
      getTrainingMode: vi.fn(() => 'performance'),
      state: {
        ...createDeps().state,
        startTime: 250,
      },
      detectMicPolyphonicFrame: vi.fn(() => ({
        detectedNotesText: 'C E',
        detectedNoteNames: ['C', 'E'],
        nextStableChordCounter: 3,
        isStableMatch: true,
        isStableMismatch: false,
      })),
      now: vi.fn(() => 2250),
    });
    const controller = createMelodyRuntimeDetectionController(deps);

    controller.handleMicrophonePolyphonicMelodyFrame(0.3);

    expect(deps.performanceResolveSuccess).toHaveBeenCalledWith(2);
    expect(deps.displayResult).not.toHaveBeenCalled();
  });

  it('delegates monophonic MIDI melody notes to the stable monophonic handler', () => {
    const deps = createDeps({
      state: {
        ...createDeps().state,
        currentPrompt: createPrompt({
          targetNote: 'A',
          targetString: 'E',
          targetMelodyEventNotes: [{ note: 'A', string: 'E', fret: 5 }],
        }),
      },
    });
    const controller = createMelodyRuntimeDetectionController(deps);

    controller.handleMidiMelodyUpdate(createMidiEvent({ noteName: 'A' }));

    expect(deps.handleStableMonophonicDetectedNote).toHaveBeenCalledWith('A');
  });

  it('handles MIDI polyphonic mismatch through melody mismatch feedback', () => {
    const deps = createDeps();
    const controller = createMelodyRuntimeDetectionController(deps);

    controller.handleMidiMelodyUpdate(
      createMidiEvent({
        heldNoteNames: ['C', 'G'],
        heldNoteNumbers: [60, 67],
      })
    );

    expect(deps.state.currentMelodyEventFoundNotes).toEqual(new Set(['C']));
    expect(deps.redrawFretboard).toHaveBeenCalled();
    expect(deps.handleMelodyPolyphonicMismatch).toHaveBeenCalledWith(
      expect.objectContaining({ displayText: 'Prompt' }),
      'C,G',
      'midi melody polyphonic mismatch redraw'
    );
  });
});
