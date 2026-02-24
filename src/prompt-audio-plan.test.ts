import { describe, expect, it } from 'vitest';
import { buildPromptAudioPlan } from './prompt-audio-plan';
import type { Prompt } from './types';

const basePrompt: Prompt = {
  displayText: 'Find note',
  targetNote: 'C',
  targetString: null,
  targetChordNotes: [],
  targetChordFingering: [],
  baseChordName: null,
};

const instrument = {
  TUNING: { A: 'A4', D: 'D4' },
  STRING_ORDER: ['A', 'D'],
  FRETBOARD: { A: { C: 3 }, D: { C: 10 } },
  getNoteWithOctave: (stringName: string, fret: number) => {
    if (stringName === 'A' && fret === 3) return 'C5';
    if (stringName === 'D' && fret === 10) return 'C5';
    return null;
  },
};

describe('buildPromptAudioPlan', () => {
  it('returns empty plan when prompt is null', () => {
    expect(
      buildPromptAudioPlan({
        prompt: null,
        trainingMode: 'random',
        instrument,
        calibratedA4: 440,
        enabledStrings: new Set(['A', 'D']),
      })
    ).toEqual({
      notesToPlay: [],
      targetFrequency: null,
      playSoundEnabled: false,
      autoPlaySound: false,
    });
  });

  it('builds chord audio plan for chord reference modes', () => {
    const prompt: Prompt = {
      ...basePrompt,
      targetNote: null,
      targetChordFingering: [
        { string: 'A', fret: 3, note: 'C' },
        { string: 'D', fret: 10, note: 'C' },
      ],
      targetChordNotes: ['C', 'E', 'G'],
    };

    expect(
      buildPromptAudioPlan({
        prompt,
        trainingMode: 'chords',
        instrument,
        calibratedA4: 440,
        enabledStrings: new Set(['A', 'D']),
      })
    ).toEqual({
      notesToPlay: ['C5', 'C5'],
      targetFrequency: null,
      playSoundEnabled: true,
      autoPlaySound: true,
    });
  });

  it('builds single-note plan with resolved target frequency', () => {
    const result = buildPromptAudioPlan({
      prompt: basePrompt,
      trainingMode: 'random',
      instrument,
      calibratedA4: 440,
      enabledStrings: new Set(['A', 'D']),
    });

    expect(result.notesToPlay).toEqual(['C5']);
    expect(result.playSoundEnabled).toBe(true);
    expect(result.autoPlaySound).toBe(true);
    expect(result.targetFrequency).not.toBeNull();
  });

  it('disables auto-play for melody mode while keeping manual sound enabled', () => {
    const result = buildPromptAudioPlan({
      prompt: basePrompt,
      trainingMode: 'melody',
      instrument,
      calibratedA4: 440,
      enabledStrings: new Set(['A', 'D']),
    });

    expect(result.notesToPlay).toEqual(['C5']);
    expect(result.playSoundEnabled).toBe(true);
    expect(result.autoPlaySound).toBe(false);
    expect(result.targetFrequency).not.toBeNull();
  });

  it('returns disabled plan when target cannot be resolved on enabled strings', () => {
    expect(
      buildPromptAudioPlan({
        prompt: basePrompt,
        trainingMode: 'random',
        instrument,
        calibratedA4: 440,
        enabledStrings: new Set(),
      })
    ).toEqual({
      notesToPlay: [],
      targetFrequency: null,
      playSoundEnabled: false,
      autoPlaySound: false,
    });
  });

  it('keeps target frequency but disables sound when note playback value is missing', () => {
    const instrumentWithoutPlayableNote = {
      ...instrument,
      getNoteWithOctave: () => null,
    };

    const result = buildPromptAudioPlan({
      prompt: basePrompt,
      trainingMode: 'random',
      instrument: instrumentWithoutPlayableNote,
      calibratedA4: 440,
      enabledStrings: new Set(['A', 'D']),
    });

    expect(result.notesToPlay).toEqual([]);
    expect(result.targetFrequency).not.toBeNull();
    expect(result.playSoundEnabled).toBe(false);
    expect(result.autoPlaySound).toBe(true);
  });
});
