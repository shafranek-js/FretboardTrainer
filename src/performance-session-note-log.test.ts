import { describe, expect, it } from 'vitest';
import {
  buildPerformanceSessionNoteLogSnapshot,
  formatPerformanceSessionNoteLogFileName,
} from './performance-session-note-log';

describe('performance-session-note-log', () => {
  it('builds sorted event entries and resolves final event status', () => {
    const snapshot = buildPerformanceSessionNoteLogSnapshot({
      sessionStats: {
        modeKey: 'performance',
        modeLabel: 'Performance (Full Run)',
        startedAtMs: 1000,
        endedAtMs: 2000,
        instrumentName: 'guitar',
        tuningPresetKey: 'standard',
        inputSource: 'microphone',
        inputDeviceLabel: 'Default microphone',
        stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
        enabledStrings: ['E', 'A', 'D', 'G', 'B', 'e'],
        minFret: 0,
        maxFret: 12,
        totalAttempts: 3,
        correctAttempts: 2,
        performanceWrongAttempts: 1,
        performanceMissedNoInputAttempts: 0,
        totalTime: 1.2,
        currentCorrectStreak: 0,
        bestCorrectStreak: 2,
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
        performanceTimingStats: {
          totalGraded: 0,
          perfect: 0,
          aBitEarly: 0,
          early: 0,
          tooEarly: 0,
          aBitLate: 0,
          late: 0,
          tooLate: 0,
          weightedScoreTotal: 0,
          totalAbsOffsetMs: 0,
        },
      },
      feedbackKey: 'melody|guitar|0|0',
      feedbackByEvent: {
        2: [
          { note: 'F#', stringName: 'B', fret: 7, status: 'correct' },
          { note: 'A', stringName: null, fret: null, status: 'wrong' },
        ],
        0: [{ note: 'E', stringName: 'E', fret: 0, status: 'missed' }],
      },
      generatedAtMs: Date.UTC(2026, 2, 5, 10, 0, 0),
    });

    expect(snapshot.entries.map((entry) => entry.eventIndex)).toEqual([0, 2]);
    expect(snapshot.entries[0]?.finalStatus).toBe('missed');
    expect(snapshot.entries[1]?.finalStatus).toBe('correct');
    expect(snapshot.entries[1]?.expectedNotes).toEqual([
      { note: 'F#', stringName: 'B', fret: 7 },
    ]);
    expect(snapshot.totals.accuracyPercent).toBeCloseTo(66.666, 1);
  });

  it('formats deterministic export filename', () => {
    const fileName = formatPerformanceSessionNoteLogFileName(
      {
        schemaVersion: 1,
        generatedAtIso: '2026-03-05T10:00:00.000Z',
        session: {
          modeKey: 'performance',
          modeLabel: 'Performance',
          startedAtMs: 0,
          endedAtMs: 1,
          instrumentName: 'guitar',
          inputSource: 'microphone',
          inputDeviceLabel: 'Default',
        },
        totals: {
          totalAttempts: 0,
          correctAttempts: 0,
          wrongAttempts: 0,
          missedNoInputAttempts: 0,
          accuracyPercent: 0,
        },
        feedbackKey: null,
        entries: [],
      },
      Date.UTC(2026, 2, 5, 10, 11, 12)
    );

    expect(fileName).toContain('fretflow-performance-note-log-');
    expect(fileName.endsWith('.json')).toBe(true);
  });

  it('prefers wrong over missed when both statuses exist for one unresolved event', () => {
    const snapshot = buildPerformanceSessionNoteLogSnapshot({
      sessionStats: {
        modeKey: 'performance',
        modeLabel: 'Performance (Full Run)',
        startedAtMs: 1000,
        endedAtMs: 2000,
        instrumentName: 'guitar',
        tuningPresetKey: 'standard',
        inputSource: 'microphone',
        inputDeviceLabel: 'Default microphone',
        stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
        enabledStrings: ['E', 'A', 'D', 'G', 'B', 'e'],
        minFret: 0,
        maxFret: 12,
        totalAttempts: 1,
        correctAttempts: 0,
        performanceWrongAttempts: 1,
        performanceMissedNoInputAttempts: 0,
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
        performanceTimingStats: {
          totalGraded: 0,
          perfect: 0,
          aBitEarly: 0,
          early: 0,
          tooEarly: 0,
          aBitLate: 0,
          late: 0,
          tooLate: 0,
          weightedScoreTotal: 0,
          totalAbsOffsetMs: 0,
        },
      },
      feedbackKey: 'melody|guitar|0|0',
      feedbackByEvent: {
        0: [
          { note: 'F', stringName: null, fret: null, status: 'wrong' },
          { note: 'E', stringName: 'E', fret: 0, status: 'missed' },
        ],
      },
      generatedAtMs: Date.UTC(2026, 2, 5, 10, 0, 0),
    });

    expect(snapshot.entries[0]?.finalStatus).toBe('wrong');
    expect(snapshot.entries[0]?.expectedNotes).toEqual([{ note: 'E', stringName: 'E', fret: 0 }]);
  });
});
