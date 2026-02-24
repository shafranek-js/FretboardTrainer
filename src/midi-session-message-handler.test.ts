import { describe, expect, it, vi } from 'vitest';
import { createMidiSessionMessageHandler } from './midi-session-message-handler';
import type { MidiNoteEvent } from './midi-runtime';

const noteOnEvent: MidiNoteEvent = {
  kind: 'noteon',
  noteNumber: 64,
  noteName: 'E4',
  velocity: 100,
  timestampMs: 123,
  heldNoteNames: ['E4'],
};

const noteOffEvent: MidiNoteEvent = {
  ...noteOnEvent,
  kind: 'noteoff',
  heldNoteNames: [],
};

function createDeps() {
  return {
    deps: {
      canProcessEvent: vi.fn(() => true),
      getCurrentModeDetectionType: vi.fn(() => 'monophonic' as const),
      getTrainingModeValue: vi.fn(() => 'random'),
      handleMelodyUpdate: vi.fn(),
      handlePolyphonicUpdate: vi.fn(),
      clearLiveDetectedHighlight: vi.fn(),
      handleStableMonophonicDetectedNote: vi.fn(),
      onRuntimeError: vi.fn(),
    },
  };
}

describe('createMidiSessionMessageHandler', () => {
  it('ignores events when session cannot process them', () => {
    const { deps } = createDeps();
    deps.canProcessEvent.mockReturnValue(false);
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOnEvent);

    expect(deps.handlePolyphonicUpdate).not.toHaveBeenCalled();
    expect(deps.handleMelodyUpdate).not.toHaveBeenCalled();
    expect(deps.handleStableMonophonicDetectedNote).not.toHaveBeenCalled();
  });

  it('routes polyphonic mode events to chord update handler', () => {
    const { deps } = createDeps();
    deps.getCurrentModeDetectionType.mockReturnValue('polyphonic');
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOnEvent);

    expect(deps.handlePolyphonicUpdate).toHaveBeenCalledWith(noteOnEvent);
    expect(deps.handleStableMonophonicDetectedNote).not.toHaveBeenCalled();
  });

  it('routes melody mode MIDI events to melody update handler', () => {
    const { deps } = createDeps();
    deps.getTrainingModeValue.mockReturnValue('melody');
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOnEvent);

    expect(deps.handleMelodyUpdate).toHaveBeenCalledWith(noteOnEvent);
    expect(deps.handlePolyphonicUpdate).not.toHaveBeenCalled();
    expect(deps.handleStableMonophonicDetectedNote).not.toHaveBeenCalled();
  });

  it('clears free-play highlight on noteoff when no held notes remain', () => {
    const { deps } = createDeps();
    deps.getTrainingModeValue.mockReturnValue('free');
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOffEvent);

    expect(deps.clearLiveDetectedHighlight).toHaveBeenCalledTimes(1);
    expect(deps.handleStableMonophonicDetectedNote).not.toHaveBeenCalled();
  });

  it('ignores monophonic noteoff outside free-play highlight clearing', () => {
    const { deps } = createDeps();
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOffEvent);

    expect(deps.clearLiveDetectedHighlight).not.toHaveBeenCalled();
    expect(deps.handleStableMonophonicDetectedNote).not.toHaveBeenCalled();
  });

  it('routes monophonic noteon to stable-note handler', () => {
    const { deps } = createDeps();
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOnEvent);

    expect(deps.handleStableMonophonicDetectedNote).toHaveBeenCalledWith('E4');
  });

  it('reports runtime errors from handler branches', () => {
    const { deps } = createDeps();
    deps.handleStableMonophonicDetectedNote.mockImplementation(() => {
      throw new Error('boom');
    });
    const handler = createMidiSessionMessageHandler(deps);

    handler(noteOnEvent);

    expect(deps.onRuntimeError).toHaveBeenCalledWith('midi input message', expect.any(Error));
  });
});
