import type { NoteStat, Stats } from './types';

export interface ProblemNoteView {
  key: string;
  label: string;
  accuracy: number;
  avgTime: number;
  score: number;
}

export interface StatsViewModel {
  highScoreText: string;
  accuracyText: string;
  avgTimeText: string;
  problemNotes: ProblemNoteView[];
}

function computeNoteScore(stat: NoteStat) {
  const accuracy = stat.attempts > 0 ? stat.correct / stat.attempts : 0;
  const avgTime = stat.correct > 0 ? stat.totalTime / stat.correct : Infinity;
  return {
    accuracy,
    avgTime,
    score: accuracy * 100 - avgTime * 5,
  };
}

function formatProblemNoteLabel(key: string) {
  return key.replace('-CHORD', ' Chord').replace('-PROG', ' Progression');
}

export function buildStatsViewModel(stats: Stats, problemNotesLimit = 3): StatsViewModel {
  const accuracy =
    stats.totalAttempts > 0 ? (stats.correctAttempts / stats.totalAttempts) * 100 : 0;
  const avgTime = stats.correctAttempts > 0 ? stats.totalTime / stats.correctAttempts : 0;

  const problemNotes = Object.entries(stats.noteStats)
    .map(([key, stat]) => {
      const score = computeNoteScore(stat);
      return {
        key,
        label: formatProblemNoteLabel(key),
        ...score,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, problemNotesLimit);

  return {
    highScoreText: String(stats.highScore),
    accuracyText: `${accuracy.toFixed(1)}%`,
    avgTimeText: `${avgTime.toFixed(2)}s`,
    problemNotes,
  };
}
