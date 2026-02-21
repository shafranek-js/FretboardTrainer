import { describe, expect, it } from 'vitest';
import { buildSessionNextPromptPlan } from './session-next-prompt-plan';

describe('buildSessionNextPromptPlan', () => {
  it('stops with explicit error when mode is missing', () => {
    expect(
      buildSessionNextPromptPlan({
        hasMode: false,
        detectionType: null,
        hasPrompt: false,
      })
    ).toEqual({
      shouldStopListening: true,
      stopReason: 'missing_mode',
      errorMessage: 'Selected training mode is not available.',
      tunerVisible: false,
      shouldResetTuner: false,
    });
  });

  it('stops without error when prompt generation fails', () => {
    expect(
      buildSessionNextPromptPlan({
        hasMode: true,
        detectionType: 'monophonic',
        hasPrompt: false,
      })
    ).toEqual({
      shouldStopListening: true,
      stopReason: 'missing_prompt',
      errorMessage: null,
      tunerVisible: true,
      shouldResetTuner: true,
    });
  });

  it('keeps tuner visible for monophonic mode', () => {
    const plan = buildSessionNextPromptPlan({
      hasMode: true,
      detectionType: 'monophonic',
      hasPrompt: true,
    });

    expect(plan.shouldStopListening).toBe(false);
    expect(plan.tunerVisible).toBe(true);
    expect(plan.shouldResetTuner).toBe(true);
  });

  it('hides tuner for polyphonic mode', () => {
    const plan = buildSessionNextPromptPlan({
      hasMode: true,
      detectionType: 'polyphonic',
      hasPrompt: true,
    });

    expect(plan.shouldStopListening).toBe(false);
    expect(plan.tunerVisible).toBe(false);
    expect(plan.shouldResetTuner).toBe(false);
  });
});
