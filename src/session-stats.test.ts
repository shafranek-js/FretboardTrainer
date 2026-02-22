import { describe, expect, it } from 'vitest';
import {
  buildSessionStatsNoteKey,
  createSessionStats,
  finalizeSessionStats,
  recordRhythmTimingAttempt,
  recordSessionAttempt,
} from './session-stats';
import type { Prompt } from './types';

function createPrompt(partial: Partial<Prompt>): Prompt {
  return {
    displayText: 'Test',
    targetNote: null,
    targetString: null,
    targetChordNotes: [],
    targetChordFingering: [],
    baseChordName: null,
    ...partial,
  };
}

describe('session-stats', () => {
  it('builds note keys for note and chord prompts', () => {
    expect(buildSessionStatsNoteKey(createPrompt({ targetNote: 'C', targetString: 'A' }))).toBe('C-A');
    expect(buildSessionStatsNoteKey(createPrompt({ baseChordName: 'G' }))).toBe('G-CHORD');
    expect(buildSessionStatsNoteKey(createPrompt({ targetNote: 'E', targetString: null }))).toBe('E');
    expect(buildSessionStatsNoteKey(null)).toBeNull();
  });

  it('records correct and incorrect attempts', () => {
    const stats = createSessionStats({
      modeKey: 'random',
      modeLabel: 'Random Note',
      stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
      enabledStrings: ['G'],
      startedAtMs: 1000,
    });
    const prompt = createPrompt({ targetNote: 'D', targetString: 'G' });
    const instrument = {
      FRETBOARD: {
        G: { D: 7 },
      },
    };

    recordSessionAttempt(stats, prompt, false, 0, instrument);
    recordSessionAttempt(stats, prompt, true, 1.25, instrument);

    expect(stats.totalAttempts).toBe(2);
    expect(stats.correctAttempts).toBe(1);
    expect(stats.totalTime).toBeCloseTo(1.25);
    expect(stats.noteStats['D-G']).toEqual({
      attempts: 2,
      correct: 1,
      totalTime: 1.25,
    });
    expect(stats.currentCorrectStreak).toBe(1);
    expect(stats.bestCorrectStreak).toBe(1);
    expect(stats.rhythmStats.totalJudged).toBe(0);
    expect(stats.targetZoneStats['G:7']).toEqual({
      attempts: 2,
      correct: 1,
      totalTime: 1.25,
    });
  });

  it('finalizes with ended timestamp and copies noteStats map', () => {
    const stats = createSessionStats({
      modeKey: 'random',
      modeLabel: 'Random Note',
      stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
      enabledStrings: ['E'],
      startedAtMs: 1000,
    });
    const prompt = createPrompt({ targetNote: 'A', targetString: 'E' });
    recordSessionAttempt(
      stats,
      prompt,
      true,
      0.8,
      {
        FRETBOARD: { E: { A: 5 } },
      }
    );

    const finalized = finalizeSessionStats(stats, 4500);
    expect(finalized).not.toBeNull();
    expect(finalized?.endedAtMs).toBe(4500);
    expect(finalized?.noteStats).not.toBe(stats.noteStats);
    expect(finalized?.targetZoneStats).not.toBe(stats.targetZoneStats);
    expect(finalized?.rhythmStats).not.toBe(stats.rhythmStats);
    expect(finalized?.noteStats['A-E']).toEqual({ attempts: 1, correct: 1, totalTime: 0.8 });
    expect(finalized?.targetZoneStats['E:5']).toEqual({ attempts: 1, correct: 1, totalTime: 0.8 });
    expect(finalized?.bestCorrectStreak).toBe(1);
  });

  it('records rhythm timing attempts into session totals and rhythm summary', () => {
    const stats = createSessionStats({
      modeKey: 'rhythm',
      modeLabel: 'Rhythm',
      stringOrder: ['E'],
      enabledStrings: ['E'],
    });

    recordRhythmTimingAttempt(stats, -34, 34, true);
    recordRhythmTimingAttempt(stats, -120, 120, false);
    recordRhythmTimingAttempt(stats, 88, 88, false);

    expect(stats.totalAttempts).toBe(3);
    expect(stats.correctAttempts).toBe(1);
    expect(stats.currentCorrectStreak).toBe(0);
    expect(stats.bestCorrectStreak).toBe(1);
    expect(stats.rhythmStats).toEqual({
      totalJudged: 3,
      onBeat: 1,
      early: 1,
      late: 1,
      totalAbsOffsetMs: 242,
      bestAbsOffsetMs: 34,
    });
  });

  it('tracks longest correct streak across mixed outcomes', () => {
    const stats = createSessionStats({
      modeKey: 'random',
      modeLabel: 'Random Note',
      stringOrder: ['E'],
      enabledStrings: ['E'],
    });
    const prompt = createPrompt({ targetNote: 'G', targetString: 'E' });
    const instrument = { FRETBOARD: { E: { G: 3 } } };

    recordSessionAttempt(stats, prompt, true, 0.5, instrument);
    recordSessionAttempt(stats, prompt, true, 0.5, instrument);
    recordSessionAttempt(stats, prompt, false, 0, instrument);
    recordSessionAttempt(stats, prompt, true, 0.5, instrument);

    expect(stats.currentCorrectStreak).toBe(1);
    expect(stats.bestCorrectStreak).toBe(2);
  });
});
