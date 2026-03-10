import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROMPT_SOUND_TAIL_MS,
  formatPromptSoundTailMs,
  getPromptSoundTailDurationSec,
  normalizePromptSoundTailMs,
} from './prompt-sound-tail';

describe('prompt-sound-tail', () => {
  it('falls back to the default tail duration when input is invalid', () => {
    expect(normalizePromptSoundTailMs(undefined)).toBe(DEFAULT_PROMPT_SOUND_TAIL_MS);
    expect(normalizePromptSoundTailMs('nope')).toBe(DEFAULT_PROMPT_SOUND_TAIL_MS);
  });

  it('clamps and rounds the tail duration to supported slider steps', () => {
    expect(normalizePromptSoundTailMs(10)).toBe(100);
    expect(normalizePromptSoundTailMs(462)).toBe(450);
    expect(normalizePromptSoundTailMs(463)).toBe(475);
    expect(normalizePromptSoundTailMs(4000)).toBe(2000);
  });

  it('formats and converts the normalized tail duration', () => {
    expect(formatPromptSoundTailMs(463)).toBe('475 ms');
    expect(getPromptSoundTailDurationSec(463)).toBe(0.475);
  });
});
