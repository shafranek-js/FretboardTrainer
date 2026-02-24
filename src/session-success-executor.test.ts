import { describe, expect, it, vi } from 'vitest';
import type { SessionSuccessPlan } from './session-success-plan';
import { executeSessionSuccessPlan } from './session-success-executor';

function createDeps() {
  let score = 10;
  return {
    deps: {
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

const prompt = {
  targetNote: 'E',
  targetString: 'A',
  targetChordFingering: [{ note: 'C', string: 'A', fret: 3 }],
  targetChordNotes: ['C', 'E', 'G'],
};

function execute(plan: SessionSuccessPlan) {
  const ctx = createDeps();
  executeSessionSuccessPlan({ successPlan: plan, prompt, deps: ctx.deps });
  return ctx;
}

describe('executeSessionSuccessPlan', () => {
  it('handles arpeggio_continue branch', () => {
    const { deps } = execute({
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

    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.nextPrompt).toHaveBeenCalledTimes(1);
  });

  it('handles arpeggio_complete branch with cooldown scheduling', () => {
    const { deps } = execute({
      kind: 'arpeggio_complete',
      nextArpeggioIndex: 0,
      scoreDelta: 0,
      message: 'Arpeggio Complete!',
      delayMs: 1500,
      hideTuner: false,
      drawSolvedFretboard: false,
      drawSolvedAsPolyphonic: false,
      usesCooldownDelay: true,
    });

    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Arpeggio Complete!', 'success');
    expect(deps.scheduleSessionCooldown).toHaveBeenCalledWith(
      'arpeggio complete nextPrompt',
      1500,
      expect.any(Function)
    );
  });

  it('handles timed branch and updates score', () => {
    const ctx = execute({
      kind: 'timed',
      nextArpeggioIndex: 0,
      scoreDelta: 4,
      message: '+4',
      delayMs: 200,
      hideTuner: false,
      drawSolvedFretboard: false,
      drawSolvedAsPolyphonic: false,
      usesCooldownDelay: false,
    });

    expect(ctx.deps.addScore).toHaveBeenCalledWith(4);
    expect(ctx.deps.setScoreValue).toHaveBeenCalledWith(14);
    expect(ctx.deps.scheduleSessionTimeout).toHaveBeenCalledWith(200, expect.any(Function), 'timed nextPrompt');
  });

  it('handles standard branch with monophonic solved draw and cooldown', () => {
    const { deps } = execute({
      kind: 'standard',
      nextArpeggioIndex: 0,
      scoreDelta: 0,
      message: 'Correct!',
      delayMs: 1500,
      hideTuner: true,
      drawSolvedFretboard: true,
      drawSolvedAsPolyphonic: false,
      usesCooldownDelay: true,
    });

    expect(deps.setResultMessage).toHaveBeenCalledWith('Correct!', 'success');
    expect(deps.setTunerVisible).toHaveBeenCalledWith(false);
    expect(deps.drawFretboard).toHaveBeenCalledWith(false, 'E', 'A');
    expect(deps.scheduleSessionCooldown).toHaveBeenCalledWith(
      'standard cooldown nextPrompt',
      1500,
      expect.any(Function)
    );
  });

  it('handles standard branch with polyphonic solved draw and timeout', () => {
    const { deps } = execute({
      kind: 'standard',
      nextArpeggioIndex: 0,
      scoreDelta: 0,
      message: 'Correct!',
      delayMs: 500,
      hideTuner: false,
      drawSolvedFretboard: true,
      drawSolvedAsPolyphonic: true,
      usesCooldownDelay: false,
    });

    expect(deps.drawFretboard).toHaveBeenCalledWith(
      false,
      null,
      null,
      prompt.targetChordFingering,
      new Set(prompt.targetChordNotes)
    );
    expect(deps.scheduleSessionTimeout).toHaveBeenCalledWith(
      500,
      expect.any(Function),
      'standard nextPrompt'
    );
  });
});
