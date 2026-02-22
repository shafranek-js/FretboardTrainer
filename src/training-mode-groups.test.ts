import { describe, expect, it } from 'vitest';
import {
  CHORD_DATA_MODE_VALUES,
  isArpeggioMode,
  isChordAudioReferenceMode,
  isChordDataMode,
  isHintDisabledMode,
  isProgressionMode,
} from './training-mode-groups';

describe('training-mode-groups', () => {
  it('exposes canonical chord data modes', () => {
    expect(CHORD_DATA_MODE_VALUES).toEqual(['chords', 'arpeggios', 'progressions']);
  });

  it('classifies chord data modes', () => {
    expect(isChordDataMode('chords')).toBe(true);
    expect(isChordDataMode('arpeggios')).toBe(true);
    expect(isChordDataMode('progressions')).toBe(true);
    expect(isChordDataMode('random')).toBe(false);
  });

  it('classifies chord reference audio modes', () => {
    expect(isChordAudioReferenceMode('chords')).toBe(true);
    expect(isChordAudioReferenceMode('progressions')).toBe(true);
    expect(isChordAudioReferenceMode('arpeggios')).toBe(false);
  });

  it('classifies special mode flags', () => {
    expect(isArpeggioMode('arpeggios')).toBe(true);
    expect(isArpeggioMode('chords')).toBe(false);
    expect(isProgressionMode('progressions')).toBe(true);
    expect(isProgressionMode('timed')).toBe(false);
    expect(isHintDisabledMode('timed')).toBe(true);
    expect(isHintDisabledMode('free')).toBe(true);
    expect(isHintDisabledMode('rhythm')).toBe(true);
    expect(isHintDisabledMode('chords')).toBe(true);
    expect(isHintDisabledMode('random')).toBe(false);
  });
});
