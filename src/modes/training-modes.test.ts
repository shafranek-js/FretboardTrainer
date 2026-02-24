import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NATURAL_NOTES } from '../constants';

const { mockDom, mockState, setPromptTextMock, getMelodyByIdMock } = vi.hoisted(() => ({
  mockDom: {
    stringSelector: {
      querySelectorAll: vi.fn(),
    },
    startFret: { value: '0' },
    endFret: { value: '12' },
    difficulty: { value: 'natural' },
    scaleSelector: { value: 'C Major' },
    randomizeChords: { checked: false },
    chordSelector: {
      value: 'C Major',
      options: [] as { value: string }[],
    },
    arpeggioPatternSelector: { value: 'ascending' },
    melodySelector: { value: 'builtin:test' },
    melodyShowNote: { checked: true },
  },
  mockState: {
    currentInstrument: {
      FRETBOARD: {} as Record<string, Record<string, number>>,
      STRING_ORDER: [] as string[],
      CHORD_FINGERINGS: {} as Record<string, { note: string; string: string; fret: number }[]>,
    },
    previousNote: null as string | null,
    scaleNotes: [] as { note: string; string: string }[],
    currentScaleIndex: 0,
    currentProgression: [] as string[],
    currentProgressionIndex: 0,
    currentArpeggioIndex: 0,
    currentPrompt: null as {
      baseChordName: string | null;
      targetChordNotes: string[];
      targetChordFingering: { note: string; string: string; fret: number }[];
    } | null,
    currentMelodyId: null as string | null,
    currentMelodyEventIndex: 0,
    currentMelodyEventFoundNotes: new Set<string>(),
    isListening: false,
  },
  setPromptTextMock: vi.fn(),
  getMelodyByIdMock: vi.fn(),
}));

vi.mock('../state', () => ({
  dom: mockDom,
  state: mockState,
}));

vi.mock('../ui-signals', () => ({
  setPromptText: setPromptTextMock,
}));

vi.mock('../melody-library', () => ({
  getMelodyById: getMelodyByIdMock,
}));

import { RandomNoteMode } from './random-note';
import { IntervalTrainingMode } from './interval-training';
import { ScalePracticeMode } from './scale-practice';
import { ChordTrainingMode } from './chord-training';
import { ChordProgressionMode } from './chord-progression';
import { ArpeggioTrainingMode } from './arpeggio-training';
import { FreePlayMode } from './free-play';
import { AdaptivePracticeMode } from './adaptive-practice';
import { RhythmTrainingMode } from './rhythm-training';
import { MelodyPracticeMode } from './melody-practice';

function setEnabledStrings(strings: string[]) {
  mockDom.stringSelector.querySelectorAll.mockReturnValue(
    strings.map((value) => ({ value })) as HTMLInputElement[]
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('alert', vi.fn());

  mockDom.startFret.value = '0';
  mockDom.endFret.value = '5';
  mockDom.difficulty.value = 'natural';
  mockDom.scaleSelector.value = 'C Major';
  mockDom.randomizeChords.checked = false;
  mockDom.chordSelector.value = 'C Major';
  mockDom.chordSelector.options = [{ value: 'C Major' }, { value: 'G Major' }];
  mockDom.arpeggioPatternSelector.value = 'ascending';
  mockDom.melodyShowNote.checked = true;

  mockState.currentInstrument.FRETBOARD = {
    E: { E: 0, F: 1, G: 3, A: 5 },
    A: { A: 0, B: 2, C: 3, D: 5 },
  };
  mockState.currentInstrument.STRING_ORDER = ['A', 'E'];
  mockState.currentInstrument.CHORD_FINGERINGS = {
    'C Major': [
      { note: 'C', string: 'A', fret: 3 },
      { note: 'E', string: 'E', fret: 0 },
      { note: 'G', string: 'E', fret: 3 },
    ],
    'G Major': [
      { note: 'G', string: 'E', fret: 3 },
      { note: 'B', string: 'A', fret: 2 },
      { note: 'D', string: 'A', fret: 5 },
    ],
  };
  mockState.previousNote = null;
  mockState.scaleNotes = [];
  mockState.currentScaleIndex = 0;
  mockState.currentProgression = ['C Major', 'G Major'];
  mockState.currentProgressionIndex = 0;
  mockState.currentArpeggioIndex = 0;
  mockState.currentPrompt = null;
  mockState.isListening = false;
  mockState.currentMelodyId = null;
  mockState.currentMelodyEventIndex = 0;
  mockState.currentMelodyEventFoundNotes.clear();
  (mockState as unknown as { stats?: { noteStats: Record<string, unknown> } }).stats = {
    noteStats: {},
  };
  getMelodyByIdMock.mockReset();
  setEnabledStrings(['E', 'A']);
});

describe('RandomNoteMode', () => {
  it('generates a playable prompt for enabled strings and range', () => {
    setEnabledStrings(['E']);
    const mode = new RandomNoteMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt!.targetString).toBe('E');
    expect(prompt!.targetNote).toBeTruthy();
    expect(prompt!.displayText).toContain('Find:');
  });

  it('returns null when no strings are enabled', () => {
    setEnabledStrings([]);
    const mode = new RandomNoteMode();
    const prompt = mode.generatePrompt();

    expect(prompt).toBeNull();
    expect(globalThis.alert).toHaveBeenCalled();
  });
});

describe('IntervalTrainingMode', () => {
  it('generates interval target note within natural pool', () => {
    const mode = new IntervalTrainingMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt!.targetString).toBeNull();
    expect(prompt!.targetNote).toBeTruthy();
    expect(NATURAL_NOTES).toContain(prompt!.targetNote!);
    expect(prompt!.displayText).toContain('Find:');
  });
});

describe('ScalePracticeMode', () => {
  it('builds sequence and emits prompt from scale notes', () => {
    const mode = new ScalePracticeMode();
    const prompt = mode.generatePrompt();

    expect(mockState.scaleNotes.length).toBeGreaterThan(0);
    expect(prompt).not.toBeNull();
    expect(prompt!.targetNote).toBeTruthy();
    expect(prompt!.targetString).toBeTruthy();
  });

  it('signals completion when sequence is exhausted', () => {
    const mode = new ScalePracticeMode();
    mockState.scaleNotes = [{ note: 'C', string: 'A' }];
    mockState.currentScaleIndex = 1;

    const prompt = mode.generatePrompt();

    expect(prompt).toBeNull();
    expect(setPromptTextMock).toHaveBeenCalledWith('Scale complete!');
  });
});

describe('ChordTrainingMode', () => {
  it('generates chord prompt from selected chord', () => {
    const mode = new ChordTrainingMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt!.baseChordName).toBe('C Major');
    expect(prompt!.targetChordNotes).toEqual(['C', 'E', 'G']);
    expect(prompt!.targetChordFingering.length).toBeGreaterThan(0);
  });
});

describe('ChordProgressionMode', () => {
  it('iterates and loops through progression chords', () => {
    const mode = new ChordProgressionMode();

    const first = mode.generatePrompt();
    const second = mode.generatePrompt();
    const third = mode.generatePrompt();

    expect(first!.baseChordName).toBe('C Major');
    expect(second!.baseChordName).toBe('G Major');
    expect(third!.baseChordName).toBe('C Major');
  });
});

describe('ArpeggioTrainingMode', () => {
  it('generates note-by-note prompts from chord notes', () => {
    const mode = new ArpeggioTrainingMode();

    const first = mode.generatePrompt();
    expect(first).not.toBeNull();
    expect(first!.targetNote).toBe('C');

    mockState.currentArpeggioIndex = 1;
    const second = mode.generatePrompt();
    expect(second).not.toBeNull();
    expect(second!.targetNote).toBe('E');
  });

  it('applies asc-desc pattern on arpeggio start', () => {
    mockDom.arpeggioPatternSelector.value = 'asc-desc';
    const mode = new ArpeggioTrainingMode();

    mode.generatePrompt();

    expect(mockState.currentPrompt).not.toBeNull();
    expect(mockState.currentPrompt!.targetChordNotes).toEqual(['C', 'E', 'G', 'E', 'C']);
  });
});

describe('FreePlayMode', () => {
  it('returns a non-targeted free-play prompt', () => {
    const mode = new FreePlayMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt.targetNote).toBeNull();
    expect(prompt.targetString).toBeNull();
    expect(prompt.targetChordNotes).toEqual([]);
    expect(prompt.displayText).toContain('Free Play');
  });
});

describe('AdaptivePracticeMode', () => {
  it('generates a playable prompt with adaptive label', () => {
    const mode = new AdaptivePracticeMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt!.targetNote).toBeTruthy();
    expect(prompt!.targetString).toBeTruthy();
    expect(prompt!.displayText).toContain('Adaptive:');
  });

  it('prioritizes weaker note-string targets when weighted selection is forced', () => {
    const originalRandom = Math.random;
    Math.random = () => 0.99; // pick tail of weighted distribution

    try {
      const statsHolder = mockState as unknown as {
        stats: { noteStats: Record<string, { attempts: number; correct: number; totalTime: number }> };
      };
      statsHolder.stats.noteStats = {
        'E-E': { attempts: 20, correct: 20, totalTime: 8 }, // strong target
        'C-A': { attempts: 12, correct: 2, totalTime: 14 }, // weak target
      };

      // Restrict to deterministic pool of two notes.
      mockDom.startFret.value = '0';
      mockDom.endFret.value = '3';
      mockDom.difficulty.value = 'natural';
      setEnabledStrings(['E', 'A']);

      const mode = new AdaptivePracticeMode();
      const prompt = mode.generatePrompt();

      expect(prompt).not.toBeNull();
      expect(prompt!.targetNote).toBe('C');
      expect(prompt!.targetString).toBe('A');
    } finally {
      Math.random = originalRandom;
    }
  });
});

describe('RhythmTrainingMode', () => {
  it('returns a non-targeted rhythm prompt', () => {
    const mode = new RhythmTrainingMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt.targetNote).toBeNull();
    expect(prompt.targetString).toBeNull();
    expect(prompt.targetChordNotes).toEqual([]);
    expect(prompt.displayText).toContain('Rhythm');
  });
});

describe('MelodyPracticeMode', () => {
  it('generates sequential prompts from the selected melody', () => {
    getMelodyByIdMock.mockReturnValue({
      id: 'builtin:test',
      name: 'Test Melody',
      events: [
        { notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
        { notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
      ],
    });

    const mode = new MelodyPracticeMode();
    const first = mode.generatePrompt();
    const second = mode.generatePrompt();

    expect(first?.targetNote).toBe('C');
    expect(first?.targetString).toBe('A');
    expect(first?.displayText).toContain('[1/2]');
    expect(second?.targetNote).toBe('D');
    expect(second?.displayText).toContain('[2/2]');
  });

  it('returns null and signals completion after the last step', () => {
    getMelodyByIdMock.mockReturnValue({
      id: 'builtin:test',
      name: 'Test Melody',
      events: [{ notes: [{ note: 'C', stringName: null, fret: null }] }],
    });
    mockState.currentMelodyId = 'builtin:test';
    mockState.currentMelodyEventIndex = 1;

    const mode = new MelodyPracticeMode();
    const prompt = mode.generatePrompt();

    expect(prompt).toBeNull();
    expect(setPromptTextMock).toHaveBeenCalledWith('Melody complete! (Test Melody)');
  });

  it('hides note hint text when melodyShowNote is disabled', () => {
    mockDom.melodyShowNote.checked = false;
    getMelodyByIdMock.mockReturnValue({
      id: 'builtin:test',
      name: 'Test Melody',
      events: [{ notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
    });

    const mode = new MelodyPracticeMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt?.targetNote).toBe('C');
    expect(prompt?.displayText).toContain('play the next note');
    expect(prompt?.displayText).not.toContain('C');
    expect(prompt?.displayText).not.toContain('fret 3');
    expect(prompt?.displayText).not.toContain('Test Melody');
  });

  it('creates a polyphonic melody event prompt from one tab column', () => {
    getMelodyByIdMock.mockReturnValue({
      id: 'builtin:test',
      name: 'Double Stop',
      events: [
        {
          notes: [
            { note: 'C', stringName: 'A', fret: 3 },
            { note: 'E', stringName: 'E', fret: 0 },
          ],
        },
      ],
    });

    const mode = new MelodyPracticeMode();
    const prompt = mode.generatePrompt();

    expect(prompt).not.toBeNull();
    expect(prompt?.targetNote).toBeNull();
    expect(prompt?.targetString).toBeNull();
    expect(prompt?.targetChordNotes).toEqual(['C', 'E']);
    expect(prompt?.targetChordFingering).toEqual([
      { note: 'C', string: 'A', fret: 3 },
      { note: 'E', string: 'E', fret: 0 },
    ]);
    expect(prompt?.targetMelodyEventNotes).toEqual([
      { note: 'C', string: 'A', fret: 3 },
      { note: 'E', string: 'E', fret: 0 },
    ]);
  });
});
