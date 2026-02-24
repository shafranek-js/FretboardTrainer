import { describe, expect, it } from 'vitest';
import {
  getArpeggioCompleteDelayMs,
  getPromptAudioInputIgnoreMs,
  getStandardSuccessDelayMs,
  normalizeSessionPace,
} from './session-pace';

describe('session-pace', () => {
  it('normalizes unknown values to normal', () => {
    expect(normalizeSessionPace('normal')).toBe('normal');
    expect(normalizeSessionPace('slow')).toBe('slow');
    expect(normalizeSessionPace('fast')).toBe('fast');
    expect(normalizeSessionPace('turbo')).toBe('normal');
    expect(normalizeSessionPace(null)).toBe('normal');
  });

  it('returns decreasing delays from slow to fast', () => {
    expect(getStandardSuccessDelayMs('slow')).toBeGreaterThan(getStandardSuccessDelayMs('normal'));
    expect(getStandardSuccessDelayMs('normal')).toBeGreaterThan(getStandardSuccessDelayMs('fast'));

    expect(getArpeggioCompleteDelayMs('slow')).toBeGreaterThan(
      getArpeggioCompleteDelayMs('normal')
    );
    expect(getArpeggioCompleteDelayMs('normal')).toBeGreaterThan(
      getArpeggioCompleteDelayMs('fast')
    );

    expect(getPromptAudioInputIgnoreMs('slow')).toBeGreaterThan(
      getPromptAudioInputIgnoreMs('normal')
    );
    expect(getPromptAudioInputIgnoreMs('normal')).toBeGreaterThan(
      getPromptAudioInputIgnoreMs('fast')
    );
  });
});
