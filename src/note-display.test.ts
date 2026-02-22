import { beforeEach, describe, expect, it } from 'vitest';
import {
  formatDisplayNote,
  formatMusicText,
  normalizeNoteNamingPreference,
  setNoteNamingPreference,
} from './note-display';

describe('note-display', () => {
  beforeEach(() => {
    setNoteNamingPreference('sharps');
  });

  it('normalizes note naming preference', () => {
    expect(normalizeNoteNamingPreference('flats')).toBe('flats');
    expect(normalizeNoteNamingPreference('sharps')).toBe('sharps');
    expect(normalizeNoteNamingPreference('auto')).toBe('sharps');
  });

  it('formats sharp notes as flats when flats preference is active', () => {
    setNoteNamingPreference('flats');
    expect(formatDisplayNote('A#')).toBe('Bb');
    expect(formatDisplayNote('C')).toBe('C');
  });

  it('formats note tokens inside text without changing unrelated text', () => {
    setNoteNamingPreference('flats');
    expect(formatMusicText('Find: A# on D string')).toBe('Find: Bb on D string');
    expect(formatMusicText('Maj 3rd: C#')).toBe('Maj 3rd: Db');
    expect(formatMusicText('Score 100')).toBe('Score 100');
  });
});

