import { describe, expect, it } from 'vitest';
import { Guitar } from './guitar';
import { Ukulele } from './ukulele';

describe('Guitar.getNoteWithOctave', () => {
  const guitar = new Guitar();

  it('returns the correct open and fretted notes', () => {
    expect(guitar.getNoteWithOctave('e', 0)).toBe('E4');
    expect(guitar.getNoteWithOctave('E', 12)).toBe('E3');
    expect(guitar.getNoteWithOctave('A', 3)).toBe('C3');
  });

  it('returns null for unknown strings', () => {
    expect(guitar.getNoteWithOctave('X', 5)).toBeNull();
  });
});

describe('Ukulele.getNoteWithOctave', () => {
  const ukulele = new Ukulele();

  it('returns the correct open and fretted notes', () => {
    expect(ukulele.getNoteWithOctave('A', 0)).toBe('A4');
    expect(ukulele.getNoteWithOctave('A', 3)).toBe('C5');
    expect(ukulele.getNoteWithOctave('G', 12)).toBe('G5');
  });

  it('returns null for unknown strings', () => {
    expect(ukulele.getNoteWithOctave('X', 3)).toBeNull();
  });
});
