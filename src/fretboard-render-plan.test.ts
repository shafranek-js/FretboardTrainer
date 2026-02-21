import { describe, expect, it } from 'vitest';
import { computeFretboardRenderPlan } from './fretboard-render-plan';
import type { Prompt } from './types';

const samplePrompt: Prompt = {
  displayText: 'Play C major',
  targetNote: null,
  targetString: null,
  targetChordNotes: ['C', 'E', 'G'],
  targetChordFingering: [
    { note: 'C', string: 'A', fret: 3 },
    { note: 'E', string: 'D', fret: 2 },
  ],
  baseChordName: 'C Major',
};

describe('computeFretboardRenderPlan', () => {
  it('returns chord plan for chord mode when listening', () => {
    const plan = computeFretboardRenderPlan({
      trainingMode: 'chords',
      isListening: true,
      showingAllNotes: false,
      currentPrompt: samplePrompt,
      currentArpeggioIndex: 0,
    });

    expect(plan.showAll).toBe(false);
    expect(plan.chordFingering.length).toBe(2);
    expect(plan.foundChordNotes.size).toBe(0);
    expect(plan.currentTargetNote).toBeNull();
  });

  it('returns arpeggio progression markers for arpeggio mode', () => {
    const plan = computeFretboardRenderPlan({
      trainingMode: 'arpeggios',
      isListening: true,
      showingAllNotes: false,
      currentPrompt: samplePrompt,
      currentArpeggioIndex: 1,
    });

    expect(plan.showAll).toBe(false);
    expect([...plan.foundChordNotes]).toEqual(['C']);
    expect(plan.currentTargetNote).toBe('E');
  });

  it('returns show-all plan when study mode enabled', () => {
    const plan = computeFretboardRenderPlan({
      trainingMode: 'random',
      isListening: false,
      showingAllNotes: true,
      currentPrompt: null,
      currentArpeggioIndex: 0,
    });

    expect(plan.showAll).toBe(true);
    expect(plan.chordFingering).toEqual([]);
  });
});
