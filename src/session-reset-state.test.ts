import { describe, expect, it } from 'vitest';
import { createSessionStopResetState } from './session-reset-state';

describe('createSessionStopResetState', () => {
  it('returns a fully reset session payload', () => {
    expect(createSessionStopResetState()).toEqual({
      stableNoteCounter: 0,
      lastNote: null,
      lastDetectedChord: '',
      stableChordCounter: 0,
      consecutiveSilence: 0,
      lastPitches: [],
      currentPrompt: null,
      scaleNotes: [],
      currentScaleIndex: 0,
      currentProgression: [],
      currentProgressionIndex: 0,
      currentArpeggioIndex: 0,
    });
  });

  it('returns fresh arrays on each call', () => {
    const first = createSessionStopResetState();
    const second = createSessionStopResetState();

    expect(first.lastPitches).not.toBe(second.lastPitches);
    expect(first.scaleNotes).not.toBe(second.scaleNotes);
    expect(first.currentProgression).not.toBe(second.currentProgression);
  });
});
