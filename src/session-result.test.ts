import { describe, expect, it } from 'vitest';
import { buildSuccessInfoSlots, calculateTimedPoints } from './session-result';
import type { Prompt } from './types';

describe('buildSuccessInfoSlots', () => {
  it('builds chord info slots for chord prompts', () => {
    const prompt: Prompt = {
      displayText: 'Play chord',
      targetNote: null,
      targetString: null,
      targetChordNotes: ['C', 'E', 'G'],
      targetChordFingering: [],
      baseChordName: 'C Major',
    };

    expect(buildSuccessInfoSlots(prompt)).toEqual({
      slot1: 'C Major',
      slot2: 'C - E - G',
      slot3: '',
    });
  });

  it('builds interval slots for single-note prompts', () => {
    const prompt: Prompt = {
      displayText: 'Find note',
      targetNote: 'A',
      targetString: 'E',
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };

    expect(buildSuccessInfoSlots(prompt)).toEqual({
      slot1: 'Note: A on E',
      slot2: 'Maj 3rd: C#',
      slot3: 'Perf 5th: E',
    });
  });

  it('returns empty slots when prompt lacks slot payload', () => {
    const prompt: Prompt = {
      displayText: 'Unknown',
      targetNote: null,
      targetString: null,
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };

    expect(buildSuccessInfoSlots(prompt)).toEqual({
      slot1: '',
      slot2: '',
      slot3: '',
    });
  });
});

describe('calculateTimedPoints', () => {
  it('awards more points for faster answers with a floor of 10', () => {
    expect(calculateTimedPoints(0.2)).toBe(98);
    expect(calculateTimedPoints(3.4)).toBe(66);
    expect(calculateTimedPoints(20)).toBe(10);
  });
});
