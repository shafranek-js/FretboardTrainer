import { describe, expect, it } from 'vitest';
import { buildStatsViewModel } from './stats-view';
import type { SessionStats, Stats } from './types';

function createStats(partial: Partial<Stats> = {}): Stats {
  return {
    highScore: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    noteStats: {},
    ...partial,
  };
}

function createSessionStats(partial: Partial<SessionStats> = {}): SessionStats {
  return {
    modeKey: 'random',
    modeLabel: 'Random Note',
    startedAtMs: 1000,
    endedAtMs: 6000,
    instrumentName: 'guitar',
    tuningPresetKey: 'standard',
    stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
    enabledStrings: ['E', 'A', 'D', 'G', 'B', 'e'],
    minFret: 0,
    maxFret: 12,
    totalAttempts: 0,
    correctAttempts: 0,
    totalTime: 0,
    currentCorrectStreak: 0,
    bestCorrectStreak: 0,
    noteStats: {},
    targetZoneStats: {},
    rhythmStats: {
      totalJudged: 0,
      onBeat: 0,
      early: 0,
      late: 0,
      totalAbsOffsetMs: 0,
      bestAbsOffsetMs: null,
    },
    ...partial,
  };
}

describe('buildStatsViewModel', () => {
  it('formats top-level summary values', () => {
    const model = buildStatsViewModel(
      createStats({
        highScore: 42,
        totalAttempts: 10,
        correctAttempts: 7,
        totalTime: 14,
      })
    );
    expect(model.highScoreText).toBe('42');
    expect(model.accuracyText).toBe('70.0%');
    expect(model.avgTimeText).toBe('2.00s');
  });

  it('sorts problem notes by score ascending and applies labels', () => {
    const model = buildStatsViewModel(
      createStats({
        noteStats: {
          'C-e': { attempts: 10, correct: 8, totalTime: 16 }, // score 72
          'G-CHORD': { attempts: 10, correct: 1, totalTime: 10 }, // score -40
          'I-V-PROG': { attempts: 4, correct: 2, totalTime: 8 }, // score 25
        },
      })
    );

    expect(model.problemNotes.map((n) => n.key)).toEqual(['G-CHORD', 'I-V-PROG', 'C-e']);
    expect(model.problemNotes[0].label).toBe('G Chord');
    expect(model.problemNotes[1].label).toBe('I-V Progression');
  });

  it('limits problem notes and handles no data', () => {
    const noData = buildStatsViewModel(createStats());
    expect(noData.problemNotes).toEqual([]);
    expect(noData.lastSession).toBeNull();

    const limited = buildStatsViewModel(
      createStats({
        noteStats: {
          A: { attempts: 1, correct: 0, totalTime: 0 },
          B: { attempts: 1, correct: 0, totalTime: 0 },
          C: { attempts: 1, correct: 0, totalTime: 0 },
        },
      }),
      2
    );
    expect(limited.problemNotes).toHaveLength(2);
  });

  it('builds last-session summary and weak spots', () => {
    const model = buildStatsViewModel(
      createStats(),
      2,
      createSessionStats({
        modeLabel: 'Adaptive Practice',
        startedAtMs: 1_000,
        endedAtMs: 66_000,
        totalAttempts: 5,
        correctAttempts: 3,
        totalTime: 4.5,
        noteStats: {
          'C-A': { attempts: 3, correct: 1, totalTime: 1.5 },
          'G-D': { attempts: 2, correct: 2, totalTime: 3.0 },
          'F-E': { attempts: 1, correct: 0, totalTime: 0 },
        },
        targetZoneStats: {
          'A:3': { attempts: 3, correct: 1, totalTime: 1.5 },
          'D:5': { attempts: 2, correct: 2, totalTime: 3.0 },
        },
      })
    );

    expect(model.lastSession).not.toBeNull();
    expect(model.lastSession?.modeLabel).toBe('Adaptive Practice');
    expect(model.lastSession?.durationText).toBe('1m 5s');
    expect(model.lastSession?.attemptsText).toBe('3/5 correct');
    expect(model.lastSession?.accuracyText).toBe('60.0%');
    expect(model.lastSession?.avgTimeText).toBe('1.50s');
    expect(model.lastSession?.bestStreakText).toBe('0');
    expect(model.lastSession?.coachTipText).toContain('Short session');
    expect(model.lastSession?.weakSpots).toHaveLength(2);
    expect(model.lastSession?.weakSpots[0].key).toBe('F-E');
    expect(model.lastSession?.heatmap).not.toBeNull();
    expect(model.lastSession?.heatmap?.cells['A:3']?.incorrect).toBe(2);
    expect(model.lastSession?.heatmap?.cells['D:5']?.incorrect).toBe(0);
    expect(model.lastSession?.rhythmSummary).toBeNull();
  });

  it('omits heatmap when session has no target-zone data', () => {
    const model = buildStatsViewModel(createStats(), 3, createSessionStats());
    expect(model.lastSession?.heatmap).toBeNull();
  });

  it('builds rhythm summary for rhythm sessions', () => {
    const model = buildStatsViewModel(
      createStats(),
      3,
      createSessionStats({
        modeKey: 'rhythm',
        modeLabel: 'Rhythm (On the Click)',
        totalAttempts: 12,
        correctAttempts: 7,
        bestCorrectStreak: 4,
        rhythmStats: {
          totalJudged: 12,
          onBeat: 7,
          early: 3,
          late: 2,
          totalAbsOffsetMs: 510,
          bestAbsOffsetMs: 8,
        },
      })
    );

    expect(model.lastSession?.rhythmSummary).not.toBeNull();
    expect(model.lastSession?.rhythmSummary?.onBeatText).toBe('7');
    expect(model.lastSession?.rhythmSummary?.earlyText).toBe('3');
    expect(model.lastSession?.rhythmSummary?.lateText).toBe('2');
    expect(model.lastSession?.rhythmSummary?.avgOffsetText).toBe('43 ms');
    expect(model.lastSession?.rhythmSummary?.bestOffsetText).toBe('8 ms');
    expect(model.lastSession?.bestStreakText).toBe('4');
    expect(model.lastSession?.coachTipText).toContain('Rhythm:');
  });
});
