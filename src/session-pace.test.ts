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
    expect(normalizeSessionPace('ultra')).toBe('ultra');
    expect(normalizeSessionPace('turbo')).toBe('normal');
    expect(normalizeSessionPace(null)).toBe('normal');
  });

  it('returns decreasing delays from slow to ultra', () => {
    expect(getStandardSuccessDelayMs('slow')).toBeGreaterThan(getStandardSuccessDelayMs('normal'));
    expect(getStandardSuccessDelayMs('normal')).toBeGreaterThan(getStandardSuccessDelayMs('fast'));
    expect(getStandardSuccessDelayMs('fast')).toBeGreaterThan(getStandardSuccessDelayMs('ultra'));

    expect(getArpeggioCompleteDelayMs('slow')).toBeGreaterThan(
      getArpeggioCompleteDelayMs('normal')
    );
    expect(getArpeggioCompleteDelayMs('normal')).toBeGreaterThan(
      getArpeggioCompleteDelayMs('fast')
    );
    expect(getArpeggioCompleteDelayMs('fast')).toBeGreaterThan(
      getArpeggioCompleteDelayMs('ultra')
    );

    expect(getPromptAudioInputIgnoreMs('slow')).toBeGreaterThan(
      getPromptAudioInputIgnoreMs('normal')
    );
    expect(getPromptAudioInputIgnoreMs('normal')).toBeGreaterThan(
      getPromptAudioInputIgnoreMs('fast')
    );
    expect(getPromptAudioInputIgnoreMs('fast')).toBeGreaterThan(
      getPromptAudioInputIgnoreMs('ultra')
    );
  });

  it('caps prompt-audio ignore window by event duration', () => {
    // 16th-note-ish duration at 140 BPM: ~107ms -> capped ignore should be ~45ms.
    expect(getPromptAudioInputIgnoreMs('ultra', 107)).toBe(45);

    // Fast/normal pace should also be clamped for short events.
    expect(getPromptAudioInputIgnoreMs('fast', 214)).toBe(90);
    expect(getPromptAudioInputIgnoreMs('normal', 214)).toBe(90);
  });

  it('falls back to base ignore window when event duration is missing/invalid', () => {
    expect(getPromptAudioInputIgnoreMs('normal', null)).toBe(380);
    expect(getPromptAudioInputIgnoreMs('normal', undefined)).toBe(380);
    expect(getPromptAudioInputIgnoreMs('normal', 0)).toBe(380);
    expect(getPromptAudioInputIgnoreMs('normal', -15)).toBe(380);
  });
});
