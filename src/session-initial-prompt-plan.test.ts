import { describe, expect, it } from 'vitest';
import {
  buildSessionInitialPromptPlan,
  PERFORMANCE_SESSION_PREROLL_BARS,
} from './session-initial-prompt-plan';

describe('session-initial-prompt-plan', () => {
  it('adds a meter-aware preroll for performance sessions', () => {
    expect(
      buildSessionInitialPromptPlan({
        trainingMode: 'performance',
        bpm: 90,
        beatsPerBar: 4,
        beatUnitDenominator: 4,
      })
    ).toEqual({
      delayMs: Math.round((60000 / 90) * 4 * PERFORMANCE_SESSION_PREROLL_BARS),
      prepMessage: 'Get ready...',
      pulseCount: 4 * PERFORMANCE_SESSION_PREROLL_BARS,
      secondaryAccentStepIndices: [],
    });
  });

  it('uses the current meter for compound-time preroll', () => {
    expect(
      buildSessionInitialPromptPlan({
        trainingMode: 'practice',
        bpm: 120,
        beatsPerBar: 6,
        beatUnitDenominator: 8,
        secondaryAccentStepIndices: [3],
      })
    ).toEqual({
      delayMs: Math.round((60000 / 120) * (4 / 8) * 6),
      prepMessage: 'Get ready...',
      pulseCount: 6,
      secondaryAccentStepIndices: [3],
    });
  });

  it('starts other modes immediately', () => {
    expect(buildSessionInitialPromptPlan({ trainingMode: 'melody' })).toEqual({
      delayMs: 0,
      prepMessage: '',
      pulseCount: 0,
      secondaryAccentStepIndices: [],
    });
    expect(buildSessionInitialPromptPlan({ trainingMode: 'random' })).toEqual({
      delayMs: 0,
      prepMessage: '',
      pulseCount: 0,
      secondaryAccentStepIndices: [],
    });
  });
});
