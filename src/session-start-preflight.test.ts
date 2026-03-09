import { describe, expect, it } from 'vitest';
import { buildSessionStartPlan } from './session-start-preflight';

describe('buildSessionStartPlan', () => {
  const progressions = {
    valid: ['C Major', 'G Major'],
    empty: [],
  };

  const instrument = {
    name: 'guitar' as const,
    STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'],
    getNoteWithOctave: () => 'E2',
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

  it('blocks study melody start when no melody is selected', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'melody',
      modeDetectionType: 'monophonic',
      progressionName: '',
      progressions,
      timedDuration: 60,
      selectedMelodyId: null,
      currentInstrument: instrument,
    });

    expect(plan.shouldStart).toBe(false);
    expect(plan.errorMessage).toBe('Select a melody to practice.');
  });

  it('blocks performance-style melody start when no melody is selected', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'practice',
      modeDetectionType: 'monophonic',
      progressionName: '',
      progressions,
      timedDuration: 60,
      selectedMelodyId: null,
      currentInstrument: instrument,
    });

    expect(plan.shouldStart).toBe(false);
    expect(plan.errorMessage).toBe('Select a melody to perform.');
  });

  it('blocks melody start when selected melody is unavailable', () => {
    const plan = buildSessionStartPlan({
      trainingMode: 'melody',
      modeDetectionType: 'monophonic',
      progressionName: '',
      progressions,
      timedDuration: 60,
      selectedMelodyId: 'missing:melody',
      currentInstrument: instrument,
    });

    expect(plan.shouldStart).toBe(false);
    expect(plan.errorMessage).toBe(
      'Selected melody is not available for the current instrument. Choose another melody or re-import the tab.'
    );
  });
});
