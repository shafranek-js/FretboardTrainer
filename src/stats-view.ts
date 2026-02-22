import type { NoteStat, SessionStats, Stats } from './types';

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
  lastSession: LastSessionViewModel | null;
}

export interface LastSessionViewModel {
  modeLabel: string;
  durationText: string;
  attemptsText: string;
  accuracyText: string;
  avgTimeText: string;
  bestStreakText: string;
  coachTipText: string | null;
  weakSpots: ProblemNoteView[];
  rhythmSummary: LastSessionRhythmSummaryView | null;
  heatmap: LastSessionHeatmapView | null;
}

export interface LastSessionRhythmSummaryView {
  onBeatText: string;
  earlyText: string;
  lateText: string;
  avgOffsetText: string;
  bestOffsetText: string;
}

export interface LastSessionHeatmapCellView {
  stringName: string;
  fret: number;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  intensity: number;
}

export interface LastSessionHeatmapView {
  strings: string[];
  frets: number[];
  maxIncorrect: number;
  cells: Record<string, LastSessionHeatmapCellView>;
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

function buildProblemNotes(noteStats: Stats['noteStats'] | SessionStats['noteStats'], limit: number) {
  return Object.entries(noteStats)
    .map(([key, stat]) => {
      const score = computeNoteScore(stat);
      return {
        key,
        label: formatProblemNoteLabel(key),
        ...score,
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

function formatDurationMs(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function buildHeatmapCellKey(stringName: string, fret: number) {
  return `${stringName}:${fret}`;
}

function buildLastSessionHeatmapView(
  sessionStats: SessionStats,
  maxCells = 13
): LastSessionHeatmapView | null {
  const fretCount = Math.max(0, sessionStats.maxFret - sessionStats.minFret + 1);
  if (fretCount <= 0 || fretCount > maxCells) return null;

  const strings = (sessionStats.enabledStrings?.length ? sessionStats.enabledStrings : sessionStats.stringOrder)
    .filter((stringName) => sessionStats.stringOrder.includes(stringName));
  if (strings.length === 0) return null;

  const frets = Array.from({ length: fretCount }, (_, idx) => sessionStats.minFret + idx);
  const rawCells: LastSessionHeatmapCellView[] = [];

  for (const [key, stat] of Object.entries(sessionStats.targetZoneStats)) {
    const [stringName, fretText] = key.split(':');
    const fret = Number.parseInt(fretText ?? '', 10);
    if (!strings.includes(stringName) || !Number.isFinite(fret)) continue;
    if (fret < sessionStats.minFret || fret > sessionStats.maxFret) continue;

    const incorrect = Math.max(0, stat.attempts - stat.correct);
    const accuracy = stat.attempts > 0 ? stat.correct / stat.attempts : 0;
    rawCells.push({
      stringName,
      fret,
      attempts: stat.attempts,
      correct: stat.correct,
      incorrect,
      accuracy,
      intensity: 0,
    });
  }

  if (rawCells.length === 0) return null;

  const maxIncorrect = Math.max(...rawCells.map((cell) => cell.incorrect), 0);
  const cells = rawCells.reduce<Record<string, LastSessionHeatmapCellView>>((acc, cell) => {
    const intensity = maxIncorrect > 0 ? cell.incorrect / maxIncorrect : 0;
    acc[buildHeatmapCellKey(cell.stringName, cell.fret)] = {
      ...cell,
      intensity,
    };
    return acc;
  }, {});

  return {
    strings,
    frets,
    maxIncorrect,
    cells,
  };
}

function getTopHeatmapErrorCell(heatmap: LastSessionHeatmapView | null) {
  if (!heatmap) return null;
  let topCell: LastSessionHeatmapCellView | null = null;
  for (const cell of Object.values(heatmap.cells)) {
    if (!topCell || cell.incorrect > topCell.incorrect) {
      topCell = cell;
    }
  }
  return topCell && topCell.incorrect > 0 ? topCell : null;
}

function buildLastSessionCoachTip(
  sessionStats: SessionStats,
  accuracyPercent: number,
  avgTime: number,
  heatmap: LastSessionHeatmapView | null
) {
  const attempts = sessionStats.totalAttempts;
  const enabledStringsCount = sessionStats.enabledStrings?.length ?? 0;
  const fretSpan = Math.max(1, sessionStats.maxFret - sessionStats.minFret + 1);
  const topHeatCell = getTopHeatmapErrorCell(heatmap);
  const rhythmStats = sessionStats.rhythmStats;

  if (sessionStats.modeKey === 'rhythm' && rhythmStats.totalJudged >= 4) {
    if (rhythmStats.early >= rhythmStats.late + 2) {
      return 'Rhythm: you are usually early. Let the click land first, then play on the pulse.';
    }
    if (rhythmStats.late >= rhythmStats.early + 2) {
      return 'Rhythm: you are usually late. Prepare your finger earlier and aim slightly ahead of the beat.';
    }
    const avgOffset = rhythmStats.totalJudged > 0 ? rhythmStats.totalAbsOffsetMs / rhythmStats.totalJudged : 0;
    if (avgOffset > 35) {
      return 'Rhythm: keep the click on and reduce note length/hand motion to tighten timing.';
    }
    return 'Rhythm: timing is fairly balanced. Keep the click on and push BPM gradually.';
  }

  if (attempts < 8) {
    return 'Short session. For useful feedback, aim for at least 10-20 graded attempts.';
  }

  if (accuracyPercent < 60) {
    if (enabledStringsCount > 2) {
      return 'Accuracy is low. Reduce to 1-2 strings, then add strings back after reaching ~80%.';
    }
    if (fretSpan > 6) {
      return 'Accuracy is low. Narrow the fret range (for example 0-5) and rebuild position mapping first.';
    }
    if (topHeatCell) {
      return `Accuracy is low. Drill the ${topHeatCell.stringName} string at fret ${topHeatCell.fret}; it caused the most misses.`;
    }
    return 'Accuracy is low. Slow the session down and repeat the same target set before expanding.';
  }

  if (topHeatCell && topHeatCell.incorrect >= 2) {
    return `Main weak zone: ${topHeatCell.stringName} string, fret ${topHeatCell.fret}. Run a short focused set on that position.`;
  }

  if (accuracyPercent >= 80 && avgTime > 2.0) {
    return 'Good accuracy. Next step: keep the same set and push speed (metronome on, higher BPM, or a session goal).';
  }

  if (sessionStats.bestCorrectStreak >= 10) {
    return 'Strong streak. Increase difficulty slightly (more strings, wider range, or all notes) to keep progressing.';
  }

  return 'Balanced session. Keep consistency and repeat this setup before increasing difficulty.';
}

function buildLastSessionViewModel(
  sessionStats: SessionStats | null | undefined,
  weakSpotsLimit: number
): LastSessionViewModel | null {
  if (!sessionStats) return null;

  const endedAtMs = sessionStats.endedAtMs ?? Date.now();
  const durationMs = Math.max(0, endedAtMs - sessionStats.startedAtMs);
  const accuracy =
    sessionStats.totalAttempts > 0
      ? (sessionStats.correctAttempts / sessionStats.totalAttempts) * 100
      : 0;
  const avgTime = sessionStats.correctAttempts > 0 ? sessionStats.totalTime / sessionStats.correctAttempts : 0;
  const rhythmStats = sessionStats.rhythmStats ?? {
    totalJudged: 0,
    onBeat: 0,
    early: 0,
    late: 0,
    totalAbsOffsetMs: 0,
    bestAbsOffsetMs: null,
  };
  const heatmap = buildLastSessionHeatmapView(sessionStats);

  return {
    modeLabel: sessionStats.modeLabel,
    durationText: formatDurationMs(durationMs),
    attemptsText: `${sessionStats.correctAttempts}/${sessionStats.totalAttempts} correct`,
    accuracyText: `${accuracy.toFixed(1)}%`,
    avgTimeText: `${avgTime.toFixed(2)}s`,
    bestStreakText: String(Math.max(0, sessionStats.bestCorrectStreak ?? 0)),
    coachTipText: buildLastSessionCoachTip(sessionStats, accuracy, avgTime, heatmap),
    weakSpots: buildProblemNotes(sessionStats.noteStats, weakSpotsLimit),
    rhythmSummary:
      sessionStats.modeKey === 'rhythm' && rhythmStats.totalJudged > 0
        ? {
            onBeatText: String(rhythmStats.onBeat),
            earlyText: String(rhythmStats.early),
            lateText: String(rhythmStats.late),
            avgOffsetText: `${(rhythmStats.totalAbsOffsetMs / rhythmStats.totalJudged).toFixed(0)} ms`,
            bestOffsetText:
              rhythmStats.bestAbsOffsetMs === null ? '-' : `${rhythmStats.bestAbsOffsetMs} ms`,
          }
        : null,
    heatmap,
  };
}

export function buildStatsViewModel(
  stats: Stats,
  problemNotesLimit = 3,
  lastSessionStats: SessionStats | null = null
): StatsViewModel {
  const accuracy =
    stats.totalAttempts > 0 ? (stats.correctAttempts / stats.totalAttempts) * 100 : 0;
  const avgTime = stats.correctAttempts > 0 ? stats.totalTime / stats.correctAttempts : 0;
  const problemNotes = buildProblemNotes(stats.noteStats, problemNotesLimit);

  return {
    highScoreText: String(stats.highScore),
    accuracyText: `${accuracy.toFixed(1)}%`,
    avgTimeText: `${avgTime.toFixed(2)}s`,
    problemNotes,
    lastSession: buildLastSessionViewModel(lastSessionStats, problemNotesLimit),
  };
}
