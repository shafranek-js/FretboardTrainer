export type CurriculumPresetKey =
  | 'custom'
  | 'beginner_essentials'
  | 'position_1_5'
  | 'interval_foundations'
  | 'accidentals_position_1_5'
  | 'adaptive_full_fretboard'
  | 'scale_foundations'
  | 'chord_foundations'
  | 'arpeggio_foundations'
  | 'progression_foundations'
  | 'rhythm_foundations'
  | 'timed_challenge_intro';

export interface CurriculumPresetDefinition {
  key: CurriculumPresetKey;
  label: string;
  description: string;
}

export interface CurriculumPresetPlan {
  key: Exclude<CurriculumPresetKey, 'custom'>;
  label: string;
  description: string;
  trainingMode: string;
  difficulty: 'natural' | 'all';
  startFret: number;
  endFret: number;
  showAllNotes: boolean;
  enabledStrings: string[];
  sessionGoal?: 'none' | 'correct_10' | 'correct_20' | 'correct_50';
  scaleValue?: string;
  chordValueCandidates?: string[];
  progressionValueCandidates?: string[];
  arpeggioPatternValue?: 'ascending' | 'descending' | 'asc-desc' | 'first-inversion' | 'second-inversion';
  metronomeEnabled?: boolean;
  metronomeBpm?: number;
  rhythmTimingWindow?: 'strict' | 'normal' | 'loose';
}

const PRESET_DEFINITIONS: CurriculumPresetDefinition[] = [
  { key: 'custom', label: 'Custom (manual setup)', description: '' },
  {
    key: 'beginner_essentials',
    label: 'Step 1: Beginner Essentials',
    description:
      'Natural notes only, low frets, reduced string set. Best for early fretboard mapping and confidence.',
  },
  {
    key: 'position_1_5',
    label: 'Step 2: Position 1-5 Mapping',
    description:
      'Adaptive drilling across the full string set in first position to strengthen weak note/string pairs.',
  },
  {
    key: 'interval_foundations',
    label: 'Step 3: Interval Foundations',
    description:
      'Natural-note interval prompts in low positions to connect theory labels to fretboard shapes.',
  },
  {
    key: 'accidentals_position_1_5',
    label: 'Step 4: Accidentals in Position 1-5',
    description:
      'Add sharps/flats in first position to complete note-name coverage before expanding range.',
  },
  {
    key: 'adaptive_full_fretboard',
    label: 'Step 5: Adaptive Full Fretboard',
    description:
      'Adaptive mode across all strings and frets to focus repetitions on your weak note/string areas.',
  },
  {
    key: 'scale_foundations',
    label: 'Step 6: Scale Foundations',
    description:
      'Scale practice in low/mid positions to connect note order patterns with fretboard geography.',
  },
  {
    key: 'chord_foundations',
    label: 'Step 7: Chord Foundations',
    description:
      'Chord identification and shape mapping with audio reference playback to build harmonic recognition.',
  },
  {
    key: 'arpeggio_foundations',
    label: 'Step 8: Arpeggio Foundations',
    description:
      'Break chord tones into note-by-note patterns to link triads to single-note targets.',
  },
  {
    key: 'progression_foundations',
    label: 'Step 9: Progression Foundations',
    description:
      'Practice common chord progressions to reinforce chord transitions and harmonic context.',
  },
  {
    key: 'rhythm_foundations',
    label: 'Step 10: Rhythm Foundations',
    description:
      'On-the-click rhythm response training to improve timing before adding speed pressure.',
  },
  {
    key: 'timed_challenge_intro',
    label: 'Step 11: Timed Challenge Intro',
    description:
      'Short, high-focus mixed challenge to consolidate recall speed after foundational drills.',
  },
];

export function getCurriculumPresetDefinitions() {
  return PRESET_DEFINITIONS;
}

function uniqueStrings(strings: string[]) {
  return Array.from(new Set(strings.filter(Boolean)));
}

function getBeginnerStrings(stringOrder: string[]) {
  // Keep the set intentionally small to reduce cognitive load in the first stage.
  return uniqueStrings(stringOrder.slice(0, Math.min(2, stringOrder.length)));
}

export function buildCurriculumPresetPlan(
  key: CurriculumPresetKey,
  stringOrder: string[]
): CurriculumPresetPlan | null {
  if (key === 'custom') return null;

  const definition = PRESET_DEFINITIONS.find((preset) => preset.key === key);
  if (!definition) return null;

  if (key === 'beginner_essentials') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'random',
      difficulty: 'natural',
      startFret: 0,
      endFret: 5,
      showAllNotes: false,
      enabledStrings: getBeginnerStrings(stringOrder),
      sessionGoal: 'correct_10',
    };
  }

  if (key === 'position_1_5') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'adaptive',
      difficulty: 'natural',
      startFret: 1,
      endFret: 5,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
    };
  }

  if (key === 'interval_foundations') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'intervals',
      difficulty: 'natural',
      startFret: 0,
      endFret: 5,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
    };
  }

  if (key === 'accidentals_position_1_5') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'random',
      difficulty: 'all',
      startFret: 0,
      endFret: 5,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
    };
  }

  if (key === 'adaptive_full_fretboard') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'adaptive',
      difficulty: 'all',
      startFret: 0,
      endFret: 12,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_20',
    };
  }

  if (key === 'scale_foundations') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'scales',
      difficulty: 'natural',
      startFret: 0,
      endFret: 7,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
      scaleValue: 'C Major',
    };
  }

  if (key === 'chord_foundations') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'chords',
      difficulty: 'natural',
      startFret: 0,
      endFret: 5,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
      chordValueCandidates: ['C Major', 'G Major'],
    };
  }

  if (key === 'arpeggio_foundations') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'arpeggios',
      difficulty: 'natural',
      startFret: 0,
      endFret: 7,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
      arpeggioPatternValue: 'ascending',
    };
  }

  if (key === 'progression_foundations') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'progressions',
      difficulty: 'natural',
      startFret: 0,
      endFret: 5,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_10',
      progressionValueCandidates: [
        'Classic Pop (I-vi-IV-V)',
        '50s Progression (I-vi-IV-V)',
        'Axis of Awesome (I-V-vi-IV)',
      ],
    };
  }

  if (key === 'rhythm_foundations') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'rhythm',
      difficulty: 'natural',
      startFret: 0,
      endFret: 12,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'correct_20',
      metronomeEnabled: true,
      metronomeBpm: 70,
      rhythmTimingWindow: 'normal',
    };
  }

  if (key === 'timed_challenge_intro') {
    return {
      key,
      label: definition.label,
      description: definition.description,
      trainingMode: 'timed',
      difficulty: 'natural',
      startFret: 0,
      endFret: 12,
      showAllNotes: false,
      enabledStrings: uniqueStrings(stringOrder),
      sessionGoal: 'none',
    };
  }

  return null;
}
