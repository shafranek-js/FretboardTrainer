import { describe, expect, it, vi } from 'vitest';
import { createMelodyPolyphonicFeedbackController } from './melody-polyphonic-feedback-controller';
import type { Prompt } from './types';

function createPrompt(): Prompt {
  return {
    displayText: 'Melody [1/2]: C + E',
    targetNote: null,
    targetString: null,
    targetChordNotes: ['C', 'E'],
    targetChordFingering: [{ note: 'C', string: 'A', fret: 3 }],
    targetMelodyEventNotes: [{ note: 'C', string: 'A', fret: 3, finger: 1 }],
    baseChordName: null,
  };
}

function createDeps(options?: { showingAllNotes?: boolean }) {
  const state = {
    currentMelodyEventFoundNotes: new Set(['C']),
    activeSessionStats: {},
    currentInstrument: {},
    showingAllNotes: options?.showingAllNotes ?? false,
  };
  const deps = {
    state,
    recordSessionAttempt: vi.fn(),
    redrawFretboard: vi.fn(),
    drawFretboard: vi.fn(),
    setResultMessage: vi.fn(),
    scheduleSessionCooldown: vi.fn((_context: string, _delayMs: number, callback: () => void) => callback()),
  };
  return { deps, state };
}

describe('melody-polyphonic-feedback-controller', () => {
  it('handles mismatch with targeted redraw and cooldown', () => {
    const prompt = createPrompt();
    const { deps, state } = createDeps();
    const controller = createMelodyPolyphonicFeedbackController(deps);

    controller.handleMismatch(prompt, 'C + F', 'poly mismatch');

    expect(state.currentMelodyEventFoundNotes.size).toBe(0);
    expect(deps.recordSessionAttempt).toHaveBeenCalledWith({}, prompt, false, 0, {});
    expect(deps.setResultMessage).toHaveBeenCalledWith('Heard: C + F [wrong]', 'error');
    expect(deps.drawFretboard).toHaveBeenCalledWith(false, null, null, prompt.targetMelodyEventNotes, new Set());
    expect(deps.scheduleSessionCooldown).toHaveBeenCalledWith('poly mismatch', 1200, expect.any(Function));
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(2);
  });

  it('skips targeted redraw when showing all notes', () => {
    const prompt = createPrompt();
    const { deps, state } = createDeps({ showingAllNotes: true });
    const controller = createMelodyPolyphonicFeedbackController(deps);

    controller.handleMismatch(prompt, 'C + F', 'poly mismatch');

    expect(state.currentMelodyEventFoundNotes.size).toBe(0);
    expect(deps.drawFretboard).not.toHaveBeenCalled();
    expect(deps.scheduleSessionCooldown).not.toHaveBeenCalled();
  });
});
