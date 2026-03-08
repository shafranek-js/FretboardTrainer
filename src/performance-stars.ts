import type { SessionStats } from './types';

export interface PerformanceStarView {
  stars: 0 | 1 | 2 | 3;
  starsText: string;
  label: string;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildOverallPerformanceScoreRatio(sessionStats: SessionStats) {
  const totalAttempts = Math.max(0, sessionStats.totalAttempts);
  const correctAttempts = Math.max(0, sessionStats.correctAttempts);
  const noteAccuracyRatio = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;
  const timingStats = sessionStats.performanceTimingStats;
  if (!timingStats || totalAttempts <= 0 || timingStats.totalGraded <= 0) {
    return clamp01(noteAccuracyRatio);
  }

  const timingQualityRatio = clamp01(timingStats.weightedScoreTotal / timingStats.totalGraded);
  const timingCoverageRatio = clamp01(timingStats.totalGraded / totalAttempts);
  const effectiveTimingRatio = timingQualityRatio * timingCoverageRatio;
  return clamp01(noteAccuracyRatio * 0.75 + effectiveTimingRatio * 0.25);
}

function formatStarsText(stars: 0 | 1 | 2 | 3) {
  return `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
}

export function resolvePerformanceStarView(sessionStats: SessionStats | null | undefined): PerformanceStarView | null {
  if (!sessionStats || sessionStats.modeKey !== 'performance' || sessionStats.completedRun !== true) {
    return null;
  }

  const totalAttempts = Math.max(0, sessionStats.totalAttempts);
  const noteAccuracyRatio = totalAttempts > 0 ? sessionStats.correctAttempts / totalAttempts : 0;
  const timingStats = sessionStats.performanceTimingStats;
  const timingCoverageRatio =
    timingStats && totalAttempts > 0 ? clamp01(timingStats.totalGraded / totalAttempts) : 0;
  const overallScoreRatio = buildOverallPerformanceScoreRatio(sessionStats);

  let stars: 0 | 1 | 2 | 3 = 1;
  if (overallScoreRatio >= 0.92 && noteAccuracyRatio >= 0.9 && timingCoverageRatio >= 0.85) {
    stars = 3;
  } else if (overallScoreRatio >= 0.75 && noteAccuracyRatio >= 0.75 && timingCoverageRatio >= 0.6) {
    stars = 2;
  }

  const label =
    stars === 3
      ? 'Excellent full run'
      : stars === 2
        ? 'Solid full run'
        : 'Completed run';

  return {
    stars,
    starsText: formatStarsText(stars),
    label,
  };
}

export function buildPerformanceStarsRunKey(sessionStats: SessionStats | null | undefined) {
  if (!sessionStats || sessionStats.modeKey !== 'performance') return null;
  const melodyId = sessionStats.melodyId?.trim();
  if (!melodyId) return null;
  const startIndex = Number.isFinite(sessionStats.melodyStudyRangeStartIndex)
    ? Math.max(0, Math.round(sessionStats.melodyStudyRangeStartIndex ?? 0))
    : 0;
  const endIndex = Number.isFinite(sessionStats.melodyStudyRangeEndIndex)
    ? Math.max(startIndex, Math.round(sessionStats.melodyStudyRangeEndIndex ?? startIndex))
    : startIndex;
  const transpose = Number.isFinite(sessionStats.melodyTransposeSemitones)
    ? Math.round(sessionStats.melodyTransposeSemitones ?? 0)
    : 0;
  const stringShift = Number.isFinite(sessionStats.melodyStringShift)
    ? Math.round(sessionStats.melodyStringShift ?? 0)
    : 0;
  return [
    sessionStats.instrumentName || 'instrument',
    melodyId,
    `${startIndex}-${endIndex}`,
    `tr${transpose}`,
    `ss${stringShift}`,
  ].join('|');
}
