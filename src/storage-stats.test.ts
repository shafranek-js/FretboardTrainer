import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  dom: {
    trainingMode: { value: 'random' } as HTMLSelectElement,
  },
  state: {
    stats: {
      highScore: 5,
      totalAttempts: 0,
      correctAttempts: 0,
      totalTime: 0,
      noteStats: {} as Record<string, { attempts: number; correct: number; totalTime: number }>,
    },
    lastSessionStats: null as Record<string, unknown> | null,
    activeSessionStats: null as Record<string, unknown> | null,
    currentPrompt: null as
      | {
          baseChordName: string | null;
          targetNote: string | null;
          targetString: string | null;
        }
      | null,
  },
}));

vi.mock('./state', () => ({
  dom: mocked.dom,
  state: mocked.state,
}));

vi.mock('./dom', () => ({
  dom: mocked.dom,
}));

function createStorage(initial?: Record<string, string>) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

const storageStatsModule = await import('./storage-stats');

describe('storage-stats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', createStorage());
    mocked.dom.trainingMode.value = 'random';
    mocked.state.stats = {
      highScore: 5,
      totalAttempts: 0,
      correctAttempts: 0,
      totalTime: 0,
      noteStats: {},
    };
    mocked.state.lastSessionStats = null;
    mocked.state.activeSessionStats = null;
    mocked.state.currentPrompt = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates persisted note stats for successful prompts', () => {
    mocked.state.currentPrompt = {
      baseChordName: null,
      targetNote: 'E',
      targetString: 'A',
    };

    storageStatsModule.updateStats(true, 1.25);

    expect(mocked.state.stats.totalAttempts).toBe(1);
    expect(mocked.state.stats.correctAttempts).toBe(1);
    expect(mocked.state.stats.totalTime).toBe(1.25);
    expect(mocked.state.stats.noteStats['E-A']).toEqual({
      attempts: 1,
      correct: 1,
      totalTime: 1.25,
    });
    expect(localStorage.getItem('fretflow-stats')).toBeNull();
    vi.runAllTimers();
    expect(localStorage.getItem('fretflow-stats')).not.toBeNull();
  });

  it('ignores timed mode and missing prompt when updating stats', () => {
    mocked.dom.trainingMode.value = 'timed';
    storageStatsModule.updateStats(true, 1);
    expect(mocked.state.stats.totalAttempts).toBe(0);

    mocked.dom.trainingMode.value = 'random';
    storageStatsModule.updateStats(true, 1);
    expect(mocked.state.stats.totalAttempts).toBe(0);
  });

  it('loads stats and normalizes missing last-session fields', () => {
    localStorage.setItem(
      'fretflow-stats',
      JSON.stringify({
        highScore: 12,
        totalAttempts: 3,
        correctAttempts: 2,
        totalTime: 4.5,
        noteStats: { 'E-A': { attempts: 3, correct: 2, totalTime: 4.5 } },
      })
    );
    localStorage.setItem(
      'fretflow-last-session-stats',
      JSON.stringify({
        modeKey: 'melody',
        modeLabel: 'Melody',
        startedAtMs: 10,
        endedAtMs: 20,
        instrumentName: 'guitar',
        stringOrder: ['E'],
        enabledStrings: ['E'],
        minFret: 0,
        maxFret: 12,
        totalAttempts: 2,
        correctAttempts: 1,
        totalTime: 1.5,
        noteStats: {},
        targetZoneStats: {},
      })
    );

    storageStatsModule.loadStats();

    expect(mocked.state.stats.highScore).toBe(12);
    expect(mocked.state.lastSessionStats).toMatchObject({
      inputSource: 'microphone',
      inputDeviceLabel: '',
      tuningPresetKey: '',
      currentCorrectStreak: 0,
      bestCorrectStreak: 0,
      performanceWrongAttempts: 0,
      performanceMissedNoInputAttempts: 0,
      rhythmStats: {
        totalJudged: 0,
        onBeat: 0,
        early: 0,
        late: 0,
        totalAbsOffsetMs: 0,
        bestAbsOffsetMs: null,
      },
    });
  });

  it('resets stats and clears persisted last-session snapshot', () => {
    localStorage.setItem('fretflow-last-session-stats', JSON.stringify({ foo: 'bar' }));
    mocked.state.lastSessionStats = { modeKey: 'melody' };
    mocked.state.activeSessionStats = { modeKey: 'melody' };

    storageStatsModule.resetStats();

    expect(mocked.state.stats).toEqual({
      highScore: 0,
      totalAttempts: 0,
      correctAttempts: 0,
      totalTime: 0,
      noteStats: {},
    });
    expect(mocked.state.lastSessionStats).toBeNull();
    expect(mocked.state.activeSessionStats).toBeNull();
    expect(localStorage.getItem('fretflow-last-session-stats')).toBeNull();
  });
});

