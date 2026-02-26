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
      liveDetectedNote: null,
      liveDetectedString: null,
      melodyFoundNotes: new Set(),
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
      liveDetectedNote: null,
      liveDetectedString: null,
      melodyFoundNotes: new Set(),
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
      liveDetectedNote: null,
      liveDetectedString: null,
      melodyFoundNotes: new Set(),
    });

    expect(plan.showAll).toBe(true);
    expect(plan.chordFingering).toEqual([]);
  });

  it('returns live note highlight plan for free mode', () => {
    const plan = computeFretboardRenderPlan({
      trainingMode: 'free',
      isListening: true,
      showingAllNotes: true,
      currentPrompt: null,
      currentArpeggioIndex: 0,
      liveDetectedNote: 'A',
      liveDetectedString: 'E',
      melodyFoundNotes: new Set(),
    });

    expect(plan.showAll).toBe(false);
    expect(plan.rootNote).toBe('A');
    expect(plan.rootString).toBeNull();
  });

  it('returns target note highlight plan for melody mode', () => {
    const melodyPrompt: Prompt = {
      displayText: 'Melody [1/4]: C (A, fret 3)',
      targetNote: 'C',
      targetString: 'A',
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };

    const plan = computeFretboardRenderPlan({
      trainingMode: 'melody',
      isListening: true,
      showingAllNotes: false,
      currentPrompt: melodyPrompt,
      currentArpeggioIndex: 0,
      liveDetectedNote: null,
      liveDetectedString: null,
      melodyFoundNotes: new Set(),
    });

    expect(plan.showAll).toBe(false);
    expect(plan.rootNote).toBe('C');
    expect(plan.rootString).toBe('A');
    expect(plan.chordFingering).toEqual([]);
  });

  it('returns multi-note highlight plan for polyphonic melody events', () => {
    const melodyPrompt: Prompt = {
      displayText: 'Melody [1/4]: C + E',
      targetNote: null,
      targetString: null,
      targetChordNotes: ['C', 'E'],
      targetChordFingering: [
        { note: 'C', string: 'A', fret: 3 },
        { note: 'E', string: 'D', fret: 2 },
      ],
      targetMelodyEventNotes: [
        { note: 'C', string: 'A', fret: 3 },
        { note: 'E', string: 'D', fret: 2 },
      ],
      baseChordName: null,
    };

    const plan = computeFretboardRenderPlan({
      trainingMode: 'melody',
      isListening: true,
      showingAllNotes: false,
      currentPrompt: melodyPrompt,
      currentArpeggioIndex: 0,
      liveDetectedNote: null,
      liveDetectedString: null,
      melodyFoundNotes: new Set(['C']),
    });

    expect(plan.rootNote).toBeNull();
    expect(plan.rootString).toBeNull();
    expect(plan.chordFingering).toEqual(melodyPrompt.targetMelodyEventNotes);
    expect([...plan.foundChordNotes]).toEqual(['C']);
  });

  it('falls back to a single exact position when a melody poly-event has one playable note', () => {
    const melodyPrompt: Prompt = {
      displayText: 'Melody [1/4]: C + E',
      targetNote: null,
      targetString: null,
      targetChordNotes: ['C', 'E'],
      targetChordFingering: [{ note: 'C', string: 'A', fret: 3 }],
      targetMelodyEventNotes: [{ note: 'C', string: 'A', fret: 3 }],
      baseChordName: null,
    };

    const plan = computeFretboardRenderPlan({
      trainingMode: 'melody',
      isListening: true,
      showingAllNotes: false,
      currentPrompt: melodyPrompt,
      currentArpeggioIndex: 0,
      liveDetectedNote: null,
      liveDetectedString: null,
      melodyFoundNotes: new Set(['C']),
    });

    expect(plan.rootNote).toBeNull();
    expect(plan.rootString).toBeNull();
    expect(plan.chordFingering).toEqual([{ note: 'C', string: 'A', fret: 3 }]);
    expect(plan.foundChordNotes).toEqual(new Set(['C']));
  });
});
