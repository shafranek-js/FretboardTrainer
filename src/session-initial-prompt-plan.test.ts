import { describe, expect, it } from 'vitest';
import {
  buildSessionInitialPromptPlan,
  PERFORMANCE_SESSION_PREROLL_MS,
  PERFORMANCE_SESSION_PREROLL_STEPS,
} from './session-initial-prompt-plan';

describe('session-initial-prompt-plan', () => {
  it('adds a preroll for performance sessions', () => {
    expect(buildSessionInitialPromptPlan('performance')).toEqual({
      delayMs: PERFORMANCE_SESSION_PREROLL_MS,
      prepMessage: 'Get ready...',
      pulseCount: PERFORMANCE_SESSION_PREROLL_STEPS,
    });
  });

  it('starts other modes immediately', () => {
    expect(buildSessionInitialPromptPlan('melody')).toEqual({
      delayMs: 0,
      prepMessage: '',
      pulseCount: 0,
    });
    expect(buildSessionInitialPromptPlan('random')).toEqual({
      delayMs: 0,
      prepMessage: '',
      pulseCount: 0,
    });
  });
});
