import { describe, expect, it, vi } from 'vitest';
import { clearLiveDetectedHighlight, updateLiveDetectedHighlight } from './live-detected-highlight';

const instrument = {
  STRING_ORDER: ['A', 'E'],
  FRETBOARD: {
    A: { C: 3, D: 5 },
    E: { E: 0, F: 1 },
  },
};

describe('clearLiveDetectedHighlight', () => {
  it('clears state and redraws when highlight exists', () => {
    const stateRef = { liveDetectedNote: 'C', liveDetectedString: 'A' };
    const redraw = vi.fn();

    clearLiveDetectedHighlight(stateRef, redraw);

    expect(stateRef).toEqual({ liveDetectedNote: null, liveDetectedString: null });
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it('does nothing when already clear', () => {
    const stateRef = { liveDetectedNote: null, liveDetectedString: null };
    const redraw = vi.fn();

    clearLiveDetectedHighlight(stateRef, redraw);

    expect(redraw).not.toHaveBeenCalled();
  });
});

describe('updateLiveDetectedHighlight', () => {
  it('resolves a playable string and redraws on change', () => {
    const stateRef = { liveDetectedNote: null, liveDetectedString: null };
    const redraw = vi.fn();

    updateLiveDetectedHighlight({
      note: 'C',
      stateRef,
      enabledStrings: new Set(['A', 'E']),
      instrument,
      redraw,
    });

    expect(stateRef.liveDetectedNote).toBe('C');
    expect(stateRef.liveDetectedString).toBe('A');
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it('does not redraw when note and resolved string are unchanged', () => {
    const stateRef = { liveDetectedNote: 'E', liveDetectedString: 'E' };
    const redraw = vi.fn();

    updateLiveDetectedHighlight({
      note: 'E',
      stateRef,
      enabledStrings: new Set(['E']),
      instrument,
      redraw,
    });

    expect(redraw).not.toHaveBeenCalled();
  });

  it('stores null string when note is not playable on enabled strings', () => {
    const stateRef = { liveDetectedNote: null, liveDetectedString: null };
    const redraw = vi.fn();

    updateLiveDetectedHighlight({
      note: 'C',
      stateRef,
      enabledStrings: new Set(['E']),
      instrument,
      redraw,
    });

    expect(stateRef.liveDetectedNote).toBe('C');
    expect(stateRef.liveDetectedString).toBeNull();
    expect(redraw).toHaveBeenCalledTimes(1);
  });
});
