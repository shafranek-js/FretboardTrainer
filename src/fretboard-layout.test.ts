import { describe, expect, it } from 'vitest';
import { computeFretboardLayout } from './fretboard-layout';

describe('computeFretboardLayout', () => {
  it('returns null for invalid dimensions', () => {
    expect(computeFretboardLayout(0, 100, 6)).toBeNull();
    expect(computeFretboardLayout(500, 0, 6)).toBeNull();
    expect(computeFretboardLayout(500, 300, 0)).toBeNull();
  });

  it('returns stable positive geometry for standard guitar viewport', () => {
    const layout = computeFretboardLayout(1200, 400, 6);
    expect(layout).not.toBeNull();
    expect(layout!.fretboardWidth).toBeGreaterThan(0);
    expect(layout!.fretboardHeight).toBeGreaterThan(0);
    expect(layout!.stringSpacing).toBeGreaterThan(0);
    expect(layout!.fretSpacing).toBeGreaterThan(0);
    expect(layout!.nutX).toBeGreaterThan(layout!.openNoteX);
  });

  it('supports single-string instruments without division errors', () => {
    const layout = computeFretboardLayout(800, 300, 1);
    expect(layout).not.toBeNull();
    expect(layout!.stringSpacing).toBeGreaterThan(0);
  });
});
