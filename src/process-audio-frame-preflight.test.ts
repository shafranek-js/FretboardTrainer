import { describe, expect, it } from 'vitest';
import { buildProcessAudioFramePreflightPlan } from './process-audio-frame-preflight';

describe('buildProcessAudioFramePreflightPlan', () => {
  it('returns silence_wait and reset actions after consecutive silence threshold', () => {
    const plan = buildProcessAudioFramePreflightPlan({
      volume: 0.0001,
      volumeThreshold: 0.001,
      consecutiveSilence: 1,
      isCalibrating: false,
      trainingMode: 'free',
      hasMode: true,
      hasCurrentPrompt: true,
    });

    expect(plan).toEqual({
      kind: 'silence_wait',
      nextConsecutiveSilence: 2,
      shouldResetTracking: true,
      shouldResetTuner: true,
      shouldClearFreeHighlight: true,
    });
  });

  it('does not reset tuner during calibration silence handling', () => {
    const plan = buildProcessAudioFramePreflightPlan({
      volume: 0.0001,
      volumeThreshold: 0.001,
      consecutiveSilence: 1,
      isCalibrating: true,
      trainingMode: 'free',
      hasMode: true,
      hasCurrentPrompt: true,
    });

    expect(plan.kind).toBe('silence_wait');
    expect(plan.shouldResetTracking).toBe(true);
    expect(plan.shouldResetTuner).toBe(false);
    expect(plan.shouldClearFreeHighlight).toBe(true);
  });

  it('returns missing_mode_or_prompt when audio is active but prompt or mode is unavailable', () => {
    const plan = buildProcessAudioFramePreflightPlan({
      volume: 0.01,
      volumeThreshold: 0.001,
      consecutiveSilence: 4,
      isCalibrating: false,
      trainingMode: 'random',
      hasMode: false,
      hasCurrentPrompt: true,
    });

    expect(plan).toEqual({
      kind: 'missing_mode_or_prompt',
      nextConsecutiveSilence: 0,
      shouldResetTracking: false,
      shouldResetTuner: false,
      shouldClearFreeHighlight: false,
    });
  });

  it('returns continue when frame is audible and mode/prompt are present', () => {
    const plan = buildProcessAudioFramePreflightPlan({
      volume: 0.01,
      volumeThreshold: 0.001,
      consecutiveSilence: 4,
      isCalibrating: false,
      trainingMode: 'random',
      hasMode: true,
      hasCurrentPrompt: true,
    });

    expect(plan.kind).toBe('continue');
    expect(plan.nextConsecutiveSilence).toBe(0);
    expect(plan.shouldResetTracking).toBe(false);
  });
});
