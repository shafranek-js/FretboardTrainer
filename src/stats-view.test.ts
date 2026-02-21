import { describe, expect, it } from 'vitest';
import { buildStatsViewModel } from './stats-view';
import type { Stats } from './types';

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
});
