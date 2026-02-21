import { describe, expect, it } from 'vitest';
import { buildSessionTimeUpPlan } from './session-timeup-plan';

describe('buildSessionTimeUpPlan', () => {
  it('keeps existing high score when current score is not higher', () => {
    expect(
      buildSessionTimeUpPlan({
        currentScore: 120,
        currentHighScore: 150,
      })
    ).toEqual({
      message: "Time's Up! Final Score: 120",
      nextHighScore: 150,
      shouldPersistHighScore: false,
    });
  });

  it('updates high score when current score is higher', () => {
    expect(
      buildSessionTimeUpPlan({
        currentScore: 200,
        currentHighScore: 150,
      })
    ).toEqual({
      message: "Time's Up! Final Score: 200",
      nextHighScore: 200,
      shouldPersistHighScore: true,
    });
  });
});
