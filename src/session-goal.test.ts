import { describe, expect, it } from 'vitest';
import {
  formatSessionGoalProgress,
  formatSessionGoalReached,
  getSessionGoalTargetCorrect,
} from './session-goal';

describe('getSessionGoalTargetCorrect', () => {
  it('maps supported goals to numeric targets', () => {
    expect(getSessionGoalTargetCorrect('correct_10')).toBe(10);
    expect(getSessionGoalTargetCorrect('correct_20')).toBe(20);
    expect(getSessionGoalTargetCorrect('correct_50')).toBe(50);
  });

  it('returns null for non-count goals', () => {
    expect(getSessionGoalTargetCorrect('none')).toBeNull();
    expect(getSessionGoalTargetCorrect('unknown')).toBeNull();
  });
});

describe('formatSessionGoalProgress', () => {
  it('formats progress and clamps displayed count to target', () => {
    expect(formatSessionGoalProgress(0, 20)).toBe('Goal progress: 0 / 20 correct');
    expect(formatSessionGoalProgress(7, 20)).toBe('Goal progress: 7 / 20 correct');
    expect(formatSessionGoalProgress(24, 20)).toBe('Goal progress: 20 / 20 correct');
  });
});

describe('formatSessionGoalReached', () => {
  it('formats goal-reached message', () => {
    expect(formatSessionGoalReached(10)).toBe('Goal reached: 10 correct answers.');
  });
});
