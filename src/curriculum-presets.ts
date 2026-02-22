export type CurriculumPresetKey =
  | 'custom'
  | 'beginner_essentials'
  | 'position_1_5'
  | 'interval_foundations';

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
}

const PRESET_DEFINITIONS: CurriculumPresetDefinition[] = [
  {
    key: 'custom',
    label: 'Custom (manual setup)',
    description: '',
  },
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
    };
  }

  return {
    key: 'interval_foundations',
    label: definition.label,
    description: definition.description,
    trainingMode: 'intervals',
    difficulty: 'natural',
    startFret: 0,
    endFret: 5,
    showAllNotes: false,
    enabledStrings: uniqueStrings(stringOrder),
  };
}

