import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPolyphonicChordDetectionController } from './polyphonic-chord-detection-controller';
import type { MidiNoteEvent } from './midi-runtime';
import type { Prompt } from './types';

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    displayText: 'Chord prompt',
    targetNote: null,
    targetString: null,
    targetChordNotes: ['C', 'E'],
    targetChordFingering: [
      { note: 'C', string: 'A', fret: 3 },
      { note: 'E', string: 'D', fret: 2 },
    ],
    targetMelodyEventNotes: undefined,
    melodyEventDurationMs: undefined,
    baseChordName: 'C',
    ...overrides,
  };
}

function createMidiEvent(overrides: Partial<MidiNoteEvent> = {}): MidiNoteEvent {
  return {
    kind: 'noteon',
    noteNumber: 60,
    noteName: 'C',
    velocity: 100,
    timestampMs: 0,
    heldNoteNames: ['C'],
    ...overrides,
  };
}

function createDeps(
  overrides: Partial<Parameters<typeof createPolyphonicChordDetectionController>[0]> = {}
) {
  return {
    state: {
      currentPrompt: createPrompt(),
      analyser: {
        fftSize: 2048,
        getFloatFrequencyData: vi.fn(),
      },
      audioContext: { sampleRate: 44100 },
      frequencyDataArray: new Float32Array(16),
      dataArray: new Float32Array(16),
      calibratedA4: 440,
      lastDetectedChord: '',
      stableChordCounter: 0,
      showingAllNotes: false,
      startTime: 0,
      activeSessionStats: { kind: 'stats' },
      currentInstrument: { name: 'Guitar' },
      micPolyphonicDetectorProvider: 'spectrum',
    },
    requiredStableFrames: 3,
    detectMicPolyphonicFrame: vi.fn(() => ({
      detectedNotesText: 'C,E',
      nextStableChordCounter: 2,
      isStableMatch: false,
      isStableMismatch: false,
    })),
    updateMicPolyphonicDetectorRuntimeStatus: vi.fn(),
    performanceNow: vi.fn(() => 10),
    now: vi.fn(() => 1000),
    displayResult: vi.fn(),
    recordSessionAttempt: vi.fn(),
    setResultMessage: vi.fn(),
    drawFretboard: vi.fn(),
    scheduleSessionCooldown: vi.fn(),
    redrawFretboard: vi.fn(),
    ...overrides,
  };
}

describe('polyphonic-chord-detection-controller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('routes stable audio chord matches into displayResult', () => {
    const deps = createDeps({
      state: {
        ...createDeps().state,
        startTime: 250,
      },
      now: vi.fn(() => 2250),
      detectMicPolyphonicFrame: vi.fn(() => ({
        detectedNotesText: 'C,E',
        nextStableChordCounter: 3,
        isStableMatch: true,
        isStableMismatch: false,
      })),
    });
    const controller = createPolyphonicChordDetectionController(deps);

    controller.handleAudioChordFrame(0.3);

    expect(deps.displayResult).toHaveBeenCalledWith(true, 2);
    expect(deps.updateMicPolyphonicDetectorRuntimeStatus).toHaveBeenCalled();
  });

  it('records and hints on audio chord mismatches when fretboard hinting is enabled', () => {
    const deps = createDeps({
      detectMicPolyphonicFrame: vi.fn(() => ({
        detectedNotesText: 'C,G',
        nextStableChordCounter: 3,
        isStableMatch: false,
        isStableMismatch: true,
      })),
    });
    const controller = createPolyphonicChordDetectionController(deps);

    controller.handleAudioChordFrame(0.4);

    expect(deps.recordSessionAttempt).toHaveBeenCalled();
    expect(deps.setResultMessage).toHaveBeenCalledWith('Heard: C,G [wrong]', 'error');
    expect(deps.drawFretboard).toHaveBeenCalledWith(
      false,
      null,
      null,
      expect.any(Array),
      expect.any(Set)
    );
    expect(deps.scheduleSessionCooldown).toHaveBeenCalledWith(
      'polyphonic mismatch redraw',
      1500,
      expect.any(Function)
    );
  });

  it('routes successful MIDI chord matches into displayResult', () => {
    const deps = createDeps({
      state: {
        ...createDeps().state,
        startTime: 500,
      },
      now: vi.fn(() => 2500),
    });
    const controller = createPolyphonicChordDetectionController(deps);

    controller.handleMidiChordUpdate(
      createMidiEvent({
        heldNoteNames: ['C', 'E'],
      })
    );

    expect(deps.displayResult).toHaveBeenCalledWith(true, 2);
  });

  it('records MIDI mismatches and schedules redraw when the wrong chord is played', () => {
    const deps = createDeps();
    const controller = createPolyphonicChordDetectionController(deps);

    controller.handleMidiChordUpdate(
      createMidiEvent({
        heldNoteNames: ['C', 'G'],
      })
    );

    expect(deps.recordSessionAttempt).toHaveBeenCalled();
    expect(deps.setResultMessage).toHaveBeenCalledWith('Heard: C,G [wrong]', 'error');
    expect(deps.drawFretboard).toHaveBeenCalledWith(
      false,
      null,
      null,
      expect.any(Array),
      expect.any(Set)
    );
    expect(deps.scheduleSessionCooldown).toHaveBeenCalledWith(
      'midi polyphonic mismatch redraw',
      1200,
      expect.any(Function)
    );
  });
});
