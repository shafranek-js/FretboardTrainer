import { describe, expect, it } from 'vitest';
import { buildSessionStartPlan } from './session-start-preflight';

describe('buildSessionStartPlan', () => {
  const progressions = {
    valid: ['C Major', 'G Major'],
    empty: [],
  };

  it('builds timed mode plan for monophonic detection', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'timed',
      modeDetectionType: 'monophonic',
      progressionName: '',
      progressions,
      timedDuration: 60,
    });

    expect(plan.sessionButtons).toEqual({
      startDisabled: true,
      stopDisabled: false,
      hintDisabled: false,
      playSoundDisabled: true,
    });
    expect(plan.timed).toEqual({
      enabled: true,
      durationSeconds: 60,
      initialScore: 0,
    });
    expect(plan.shouldStart).toBe(true);
  });

  it('requires progression selection for progression mode', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'progressions',
      modeDetectionType: 'polyphonic',
      progressionName: '',
      progressions,
      timedDuration: 60,
    });

    expect(plan.progression.isRequired).toBe(true);
    expect(plan.progression.isValid).toBe(false);
    expect(plan.shouldStart).toBe(false);
    expect(plan.errorMessage).toBe('Please select a valid chord progression.');
  });

  it('accepts valid progression for progression mode', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'progressions',
      modeDetectionType: 'polyphonic',
      progressionName: 'valid',
      progressions,
      timedDuration: 60,
    });

    expect(plan.progression.isRequired).toBe(true);
    expect(plan.progression.isValid).toBe(true);
    expect(plan.progression.selected).toEqual(['C Major', 'G Major']);
    expect(plan.shouldStart).toBe(true);
    expect(plan.errorMessage).toBeNull();
  });

  it('marks arpeggio mode for index reset', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'arpeggios',
      modeDetectionType: 'polyphonic',
      progressionName: '',
      progressions,
      timedDuration: 60,
    });

    expect(plan.resetArpeggioIndex).toBe(true);
    expect(plan.sessionButtons.hintDisabled).toBe(true);
  });
});
