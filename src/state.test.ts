import { describe, expect, it } from 'vitest';
import { createInitialState, state } from './state';

describe('state', () => {
  it('creates the expected initial application state', () => {
    const initialState = createInitialState();

    expect(initialState.audioContext).toBeNull();
    expect(initialState.isListening).toBe(false);
    expect(initialState.currentPrompt).toBeNull();
    expect(initialState.currentMelodyEventFoundNotes).toBeInstanceOf(Set);
    expect(initialState.currentMelodyEventFoundNotes.size).toBe(0);
    expect(initialState.pendingTimeoutIds).toBeInstanceOf(Set);
    expect(initialState.pendingTimeoutIds.size).toBe(0);
    expect(initialState.currentInstrument).toBe(state.currentInstrument);
    expect(initialState.uiWorkflow).toBe('learn-notes');
    expect(initialState.uiMode).toBe('simple');
    expect(initialState.inputSource).toBe('microphone');
    expect(initialState.micPolyphonicDetectorProvider).toBe('spectrum');
    expect(initialState.audioCache).toEqual({});
  });

  it('returns fresh mutable containers for each initial state instance', () => {
    const first = createInitialState();
    const second = createInitialState();

    first.currentMelodyEventFoundNotes.add('A4');
    first.pendingTimeoutIds.add(1);
    first.melodyTransposeById.demo = 2;
    first.stats.totalAttempts = 9;
    first.audioCache.guitar = {} as never;

    expect(second.currentMelodyEventFoundNotes.size).toBe(0);
    expect(second.pendingTimeoutIds.size).toBe(0);
    expect(second.melodyTransposeById).toEqual({});
    expect(second.stats.totalAttempts).toBe(0);
    expect(second.audioCache).toEqual({});
  });
});
