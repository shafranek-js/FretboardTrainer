export function getSessionGoalTargetCorrect(goalValue: string) {
  if (goalValue === 'correct_10') return 10;
  if (goalValue === 'correct_20') return 20;
  if (goalValue === 'correct_50') return 50;
  return null;
}

export function formatSessionGoalProgress(correctAttempts: number, goalTargetCorrect: number) {
  return `Goal progress: ${Math.min(correctAttempts, goalTargetCorrect)} / ${goalTargetCorrect} correct`;
}

export function formatSessionGoalReached(goalTargetCorrect: number) {
  return `Goal reached: ${goalTargetCorrect} correct answers.`;
}
