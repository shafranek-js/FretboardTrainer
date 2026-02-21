export interface SessionTimeUpPlanInput {
  currentScore: number;
  currentHighScore: number;
}

export interface SessionTimeUpPlan {
  message: string;
  nextHighScore: number;
  shouldPersistHighScore: boolean;
}

export function buildSessionTimeUpPlan({
  currentScore,
  currentHighScore,
}: SessionTimeUpPlanInput): SessionTimeUpPlan {
  const shouldPersistHighScore = currentScore > currentHighScore;
  return {
    message: `Time's Up! Final Score: ${currentScore}`,
    nextHighScore: shouldPersistHighScore ? currentScore : currentHighScore,
    shouldPersistHighScore,
  };
}
