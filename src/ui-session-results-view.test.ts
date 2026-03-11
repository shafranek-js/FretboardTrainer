import { beforeEach, describe, expect, it, vi } from 'vitest';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((...values: string[]) => values.forEach((value) => classes.add(value))),
    remove: vi.fn((...values: string[]) => values.forEach((value) => classes.delete(value))),
    toggle: vi.fn((value: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    }),
    contains: (value: string) => classes.has(value),
  };
}

function createElementStub() {
  const element = {
    classList: createClassListState(),
    style: {} as Record<string, string>,
    textContent: '',
    title: '',
    innerHTML: '',
    disabled: false,
    children: [] as unknown[],
    appendChild: vi.fn((child: unknown) => {
      element.children.push(child);
      return child;
    }),
  };
  return element;
}

const harness = vi.hoisted(() => ({
  dom: {
    statsHighScore: createElementStub(),
    statsAccuracy: createElementStub(),
    statsAvgTime: createElementStub(),
    repeatLastSessionBtn: createElementStub(),
    statsProblemNotes: createElementStub(),
    statsLastSessionSection: createElementStub(),
    statsLastSessionMode: createElementStub(),
    statsLastSessionInput: createElementStub(),
    statsLastSessionDuration: createElementStub(),
    statsLastSessionAttempts: createElementStub(),
    statsLastSessionAccuracy: createElementStub(),
    statsLastSessionAvgTime: createElementStub(),
    statsLastSessionBestStreak: createElementStub(),
    statsLastSessionStarsCard: createElementStub(),
    statsLastSessionStars: createElementStub(),
    statsLastSessionStarsDetail: createElementStub(),
    statsLastSessionCoachTip: createElementStub(),
    statsLastSessionWeakSpots: createElementStub(),
    statsLastSessionRhythmSummary: createElementStub(),
    statsRhythmOnBeat: createElementStub(),
    statsRhythmEarly: createElementStub(),
    statsRhythmLate: createElementStub(),
    statsRhythmAvgOffset: createElementStub(),
    statsRhythmBestOffset: createElementStub(),
    statsLastSessionHeatmap: createElementStub(),
    sessionSummaryMode: createElementStub(),
    sessionSummaryInput: createElementStub(),
    sessionSummaryDuration: createElementStub(),
    sessionSummaryAccuracy: createElementStub(),
    sessionSummaryOverallScoreLabel: createElementStub(),
    sessionSummaryOverallScore: createElementStub(),
    sessionSummaryStarsCard: createElementStub(),
    sessionSummaryStars: createElementStub(),
    sessionSummaryStarsDetail: createElementStub(),
    sessionSummaryCorrect: createElementStub(),
    sessionSummaryWrong: createElementStub(),
    sessionSummaryMissedNoInput: createElementStub(),
    sessionSummaryTimingAccuracy: createElementStub(),
    sessionSummaryTimingOffset: createElementStub(),
    sessionSummaryTimingBreakdown: createElementStub(),
    sessionSummaryAvgTime: createElementStub(),
    sessionSummaryBestStreak: createElementStub(),
    sessionSummaryCoachTip: createElementStub(),
    sessionSummaryNextStep: createElementStub(),
    sessionSummaryOverallScoreCard: createElementStub(),
    sessionSummaryWrongCard: createElementStub(),
    sessionSummaryMissedCard: createElementStub(),
    sessionSummaryTimingAccuracyCard: createElementStub(),
    sessionSummaryTimingOffsetCard: createElementStub(),
    sessionSummaryTimingBreakdownCard: createElementStub(),
    sessionSummaryWeakSpots: createElementStub(),
  },
}));

vi.mock('./dom', () => ({ dom: harness.dom }));
vi.mock('./note-display', () => ({ formatMusicText: (value: string) => `fmt:${value}` }));
vi.stubGlobal('document', {
  createElement: vi.fn(() => createElementStub()),
});

import { renderSessionSummaryView, renderStatsView } from './ui-session-results-view';

describe('ui-session-results-view', () => {
  beforeEach(() => {
    harness.dom.statsProblemNotes.innerHTML = '';
    harness.dom.statsProblemNotes.children = [];
    harness.dom.statsLastSessionWeakSpots.innerHTML = '';
    harness.dom.statsLastSessionWeakSpots.children = [];
    harness.dom.statsLastSessionHeatmap.innerHTML = '';
    harness.dom.statsLastSessionHeatmap.children = [];
    harness.dom.sessionSummaryWeakSpots.innerHTML = '';
    harness.dom.sessionSummaryWeakSpots.children = [];
  });

  it('renders empty stats state', () => {
    renderStatsView({
      highScoreText: '0',
      accuracyText: '0%',
      avgTimeText: '0s',
      problemNotes: [],
      lastSession: null,
    });

    expect(harness.dom.statsHighScore.textContent).toBe('0');
    expect(harness.dom.repeatLastSessionBtn.disabled).toBe(true);
    expect(harness.dom.statsProblemNotes.innerHTML).toContain('No data yet');
    expect(harness.dom.statsLastSessionSection.classList.contains('hidden')).toBe(true);
  });

  it('renders populated last-session stats state', () => {
    renderStatsView({
      highScoreText: '12',
      accuracyText: '95%',
      avgTimeText: '1.2s',
      problemNotes: [{ key: 'A', label: 'A', accuracy: 0.5, avgTime: 1.23, score: 1 }],
      lastSession: {
        modeLabel: 'Random',
        inputText: 'Mic',
        durationText: '1m',
        attemptsText: '10',
        correctAttemptsText: '8',
        wrongAttemptsText: '2',
        missedNoInputAttemptsText: '0',
        totalAttemptsText: '10',
        accuracyText: '80%',
        overallScoreLabel: 'Overall Score',
        overallPerformanceScoreText: '80%',
        showFormalPerformanceMetrics: true,
        starsText: '3 stars',
        starsDetailText: 'detail',
        avgTimeText: '1.0s',
        bestStreakText: '5',
        coachTipText: 'Relax',
        nextStepText: 'Practice',
        weakSpots: [{ key: 'B', label: 'B', accuracy: 0.2, avgTime: 1.5, score: 1 }],
        rhythmSummary: {
          onBeatText: '5', earlyText: '1', lateText: '2', avgOffsetText: '12ms', bestOffsetText: '4ms',
        },
        performanceTimingSummary: null,
        heatmap: {
          strings: ['E'],
          frets: [0],
          maxIncorrect: 2,
          cells: {
            'E:0': { stringName: 'E', fret: 0, attempts: 2, correct: 0, incorrect: 2, accuracy: 0, intensity: 1 },
          },
        },
      },
    });

    expect(harness.dom.repeatLastSessionBtn.disabled).toBe(false);
    expect(harness.dom.statsLastSessionSection.classList.contains('hidden')).toBe(false);
    expect(harness.dom.statsLastSessionMode.textContent).toBe('fmt:Random');
    expect(harness.dom.statsLastSessionCoachTip.textContent).toBe('fmt:Relax');
    expect(harness.dom.statsLastSessionWeakSpots.children.length).toBe(1);
    expect(harness.dom.statsLastSessionHeatmap.children.length).toBe(2);
  });

  it('renders empty and populated session summary states', () => {
    renderSessionSummaryView(null);
    expect(harness.dom.sessionSummaryMode.textContent).toBe('-');
    expect(harness.dom.sessionSummaryWeakSpots.innerHTML).toContain('No graded note attempts');

    renderSessionSummaryView({
      modeLabel: 'Practice',
      inputText: 'Mic',
      durationText: '2m',
      attemptsText: '10',
      correctAttemptsText: '9',
      wrongAttemptsText: '1',
      missedNoInputAttemptsText: '0',
      totalAttemptsText: '10',
      accuracyText: '90%',
      overallScoreLabel: 'Final Score',
      overallPerformanceScoreText: '91%',
      showFormalPerformanceMetrics: true,
      starsText: '4 stars',
      starsDetailText: 'detail',
      avgTimeText: '0.9s',
      bestStreakText: '8',
      coachTipText: 'Good job',
      nextStepText: 'Keep going',
      weakSpots: [{ key: 'C', label: 'C', accuracy: 0.4, avgTime: 1.2, score: 1 }],
      rhythmSummary: null,
      performanceTimingSummary: {
        timingAccuracyText: '88%',
        breakdownText: 'mostly on time',
        avgOffsetText: '9ms',
      },
      heatmap: null,
    });

    expect(harness.dom.sessionSummaryMode.textContent).toBe('fmt:Practice');
    expect(harness.dom.sessionSummaryCorrect.textContent).toBe('9 / 10');
    expect(harness.dom.sessionSummaryCoachTip.textContent).toBe('fmt:Good job');
    expect(harness.dom.sessionSummaryWeakSpots.children.length).toBe(1);
    expect(harness.dom.sessionSummaryTimingAccuracy.textContent).toBe('88%');
  });
});
