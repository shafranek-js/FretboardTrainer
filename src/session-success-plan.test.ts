import { describe, expect, it } from 'vitest';
import { buildSessionSuccessPlan } from './session-success-plan';

describe('buildSessionSuccessPlan', () => {
  it('returns arpeggio continue plan while notes remain', () => {
    const plan = buildSessionSuccessPlan({
      trainingMode: 'arpeggios',
      detectionType: 'polyphonic',
      elapsedSeconds: 0.8,
      currentArpeggioIndex: 0,
      arpeggioLength: 3,
      showingAllNotes: false,
      sessionPace: 'normal',
    });

    expect(plan).toEqual({
      kind: 'arpeggio_continue',
      nextArpeggioIndex: 1,
      scoreDelta: 0,
      message: '',
      delayMs: 0,
      hideTuner: false,
      drawSolvedFretboard: false,
      drawSolvedAsPolyphonic: false,
      usesCooldownDelay: false,
    });
  });

  it('returns arpeggio complete plan at final note', () => {
    const plan = buildSessionSuccessPlan({
      trainingMode: 'arpeggios',
      detectionType: 'polyphonic',
      elapsedSeconds: 1.2,
      currentArpeggioIndex: 2,
      arpeggioLength: 3,
      showingAllNotes: false,
      sessionPace: 'slow',
    });

    expect(plan.kind).toBe('arpeggio_complete');
    expect(plan.nextArpeggioIndex).toBe(0);
    expect(plan.message).toBe('Arpeggio Complete!');
    expect(plan.delayMs).toBe(1500);
    expect(plan.usesCooldownDelay).toBe(true);
  });

  it('returns timed plan with score delta and quick next prompt', () => {
    const plan = buildSessionSuccessPlan({
      trainingMode: 'timed',
      detectionType: 'monophonic',
      elapsedSeconds: 1.4,
      currentArpeggioIndex: 0,
      arpeggioLength: 0,
      showingAllNotes: false,
      sessionPace: 'fast',
    });

    expect(plan.kind).toBe('timed');
    expect(plan.scoreDelta).toBe(86);
    expect(plan.message).toBe('+86');
    expect(plan.delayMs).toBe(200);
  });

  it('returns standard plan with solved-fretboard drawing when allowed', () => {
    const plan = buildSessionSuccessPlan({
      trainingMode: 'random',
      detectionType: 'polyphonic',
      elapsedSeconds: 2.345,
      currentArpeggioIndex: 0,
      arpeggioLength: 0,
      showingAllNotes: false,
      sessionPace: 'slow',
    });

    expect(plan.kind).toBe('standard');
    expect(plan.message).toBe('Correct! Time: 2.35s');
    expect(plan.hideTuner).toBe(true);
    expect(plan.drawSolvedFretboard).toBe(true);
    expect(plan.drawSolvedAsPolyphonic).toBe(true);
    expect(plan.delayMs).toBe(1500);
  });

  it('disables solved-fretboard drawing when show-all-notes is enabled', () => {
    const plan = buildSessionSuccessPlan({
      trainingMode: 'random',
      detectionType: 'monophonic',
      elapsedSeconds: 0.5,
      currentArpeggioIndex: 0,
      arpeggioLength: 0,
      showingAllNotes: true,
      sessionPace: 'normal',
    });

    expect(plan.kind).toBe('standard');
    expect(plan.drawSolvedFretboard).toBe(false);
    expect(plan.drawSolvedAsPolyphonic).toBe(false);
  });

  it('reduces standard delay in fast pace', () => {
    const normal = buildSessionSuccessPlan({
      trainingMode: 'random',
      detectionType: 'monophonic',
      elapsedSeconds: 0.5,
      currentArpeggioIndex: 0,
      arpeggioLength: 0,
      showingAllNotes: false,
      sessionPace: 'normal',
    });
    const fast = buildSessionSuccessPlan({
      trainingMode: 'random',
      detectionType: 'monophonic',
      elapsedSeconds: 0.5,
      currentArpeggioIndex: 0,
      arpeggioLength: 0,
      showingAllNotes: false,
      sessionPace: 'fast',
    });

    expect(fast.delayMs).toBeLessThan(normal.delayMs);
  });
});
