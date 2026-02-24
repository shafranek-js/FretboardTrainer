import { describe, expect, it, vi } from 'vitest';
import { executeDisplayResultSuccessFlow } from './display-result-success-flow-executor';
import type { Prompt } from './types';

function createPrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    displayText: 'Find E on B',
    targetNote: 'E',
    targetString: 'B',
    targetChordNotes: [],
    targetChordFingering: [],
    baseChordName: null,
    ...overrides,
  };
}

function createDeps() {
  let score = 10;
  return {
    deps: {
      setInfoSlots: vi.fn(),
      setSessionGoalProgress: vi.fn(),
      stopListening: vi.fn(),
      setCurrentArpeggioIndex: vi.fn(),
      setResultMessage: vi.fn(),
      setScoreValue: vi.fn(),
      setTunerVisible: vi.fn(),
      redrawFretboard: vi.fn(),
      drawFretboard: vi.fn(),
      scheduleSessionTimeout: vi.fn(),
      scheduleSessionCooldown: vi.fn(),
      nextPrompt: vi.fn(),
      addScore: vi.fn((delta: number) => {
        score += delta;
        return score;
      }),
    },
    getScore: () => score,
  };
}

describe('executeDisplayResultSuccessFlow', () => {
  it('updates info slots, goal progress, and runs success plan', () => {
    const ctx = createDeps();
    const outcome = executeDisplayResultSuccessFlow(
      {
        prompt: createPrompt(),
        trainingMode: 'random',
        modeDetectionType: 'monophonic',
        elapsedSeconds: 1.23,
        currentArpeggioIndex: 0,
        showingAllNotes: false,
        sessionPace: 'normal',
        goalTargetCorrect: 10,
        correctAttempts: 3,
      },
      ctx.deps
    );

    expect(outcome).toBe('success_plan_executed');
    expect(ctx.deps.setInfoSlots).toHaveBeenCalledWith('Note: E on B', 'Maj 3rd: G#', 'Perf 5th: B');
    expect(ctx.deps.setSessionGoalProgress).toHaveBeenCalledWith('Goal progress: 3 / 10 correct');
    expect(ctx.deps.setCurrentArpeggioIndex).toHaveBeenCalledWith(0);
    expect(ctx.deps.setResultMessage).toHaveBeenCalledWith('Correct! Time: 1.23s', 'success');
    expect(ctx.deps.scheduleSessionCooldown).toHaveBeenCalledWith(
      'standard cooldown nextPrompt',
      650,
      expect.any(Function)
    );
  });

  it('stops session when non-timed goal is reached', () => {
    const ctx = createDeps();
    const outcome = executeDisplayResultSuccessFlow(
      {
        prompt: createPrompt(),
        trainingMode: 'random',
        modeDetectionType: 'monophonic',
        elapsedSeconds: 0.4,
        currentArpeggioIndex: 0,
        showingAllNotes: false,
        sessionPace: 'normal',
        goalTargetCorrect: 3,
        correctAttempts: 3,
      },
      ctx.deps
    );

    expect(outcome).toBe('goal_reached');
    expect(ctx.deps.stopListening).toHaveBeenCalledTimes(1);
    expect(ctx.deps.setResultMessage).toHaveBeenCalledWith('Goal reached: 3 correct answers.', 'success');
    expect(ctx.deps.setCurrentArpeggioIndex).not.toHaveBeenCalled();
    expect(ctx.deps.scheduleSessionCooldown).not.toHaveBeenCalled();
    expect(ctx.deps.scheduleSessionTimeout).not.toHaveBeenCalled();
  });

  it('does not stop timed mode when goal threshold is reached', () => {
    const ctx = createDeps();
    const outcome = executeDisplayResultSuccessFlow(
      {
        prompt: createPrompt(),
        trainingMode: 'timed',
        modeDetectionType: 'monophonic',
        elapsedSeconds: 1.5,
        currentArpeggioIndex: 0,
        showingAllNotes: false,
        sessionPace: 'normal',
        goalTargetCorrect: 3,
        correctAttempts: 3,
      },
      ctx.deps
    );

    expect(outcome).toBe('success_plan_executed');
    expect(ctx.deps.stopListening).not.toHaveBeenCalled();
    expect(ctx.deps.setSessionGoalProgress).toHaveBeenCalledWith('Goal progress: 3 / 3 correct');
    expect(ctx.deps.setScoreValue).toHaveBeenCalledWith(expect.any(Number));
    expect(ctx.getScore()).toBeGreaterThan(10);
    expect(ctx.deps.scheduleSessionTimeout).toHaveBeenCalledWith(
      200,
      expect.any(Function),
      'timed nextPrompt'
    );
  });

  it('handles arpeggio prompt and advances arpeggio index', () => {
    const ctx = createDeps();
    const outcome = executeDisplayResultSuccessFlow(
      {
        prompt: createPrompt({
          baseChordName: 'B',
          targetChordNotes: ['B', 'D#', 'F#'],
          targetChordFingering: [{ note: 'B', string: 'A', fret: 2 }],
          targetNote: null,
          targetString: null,
        }),
        trainingMode: 'arpeggios',
        modeDetectionType: 'monophonic',
        elapsedSeconds: 0.8,
        currentArpeggioIndex: 0,
        showingAllNotes: false,
        sessionPace: 'normal',
        goalTargetCorrect: null,
        correctAttempts: null,
      },
      ctx.deps
    );

    expect(outcome).toBe('success_plan_executed');
    expect(ctx.deps.setInfoSlots).toHaveBeenCalledWith('B', 'B - D# - F#', '');
    expect(ctx.deps.setCurrentArpeggioIndex).toHaveBeenCalledWith(1);
    expect(ctx.deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(ctx.deps.nextPrompt).toHaveBeenCalledTimes(1);
  });
});
