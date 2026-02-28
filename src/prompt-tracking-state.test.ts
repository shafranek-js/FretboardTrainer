import { describe, expect, it } from 'vitest';
import {
  createPromptCycleTrackingResetState,
  createStabilityTrackingResetState,
} from './prompt-tracking-state';

describe('createStabilityTrackingResetState', () => {
  it('returns clean stability state', () => {
    expect(createStabilityTrackingResetState()).toEqual({
      stableNoteCounter: 0,
      lastNote: null,
      lastDetectedChord: '',
      stableChordCounter: 0,
    });
  });
});

describe('createPromptCycleTrackingResetState', () => {
  it('returns clean prompt-cycle state with silence and pitch history reset', () => {
    expect(createPromptCycleTrackingResetState()).toEqual({
      stableNoteCounter: 0,
      lastNote: null,
      lastDetectedChord: '',
      stableChordCounter: 0,
      consecutiveSilence: 0,
      lastPitches: [],
      performancePromptResolved: false,
      performancePromptMatched: false,
    });
  });

  it('returns a new pitch-history array each call', () => {
    const first = createPromptCycleTrackingResetState();
    const second = createPromptCycleTrackingResetState();

    expect(first.lastPitches).not.toBe(second.lastPitches);
  });
});
