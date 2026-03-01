import { describe, expect, it, vi } from 'vitest';
import { createPracticeSetupSummaryController } from './practice-setup-summary-controller';

function createSelect(value: string, label: string) {
  return {
    value,
    selectedOptions: [{ textContent: label }],
  } as unknown as HTMLSelectElement;
}

function createInput(value: string, checked = false) {
  return {
    value,
    checked,
  } as unknown as HTMLInputElement;
}

function createDeps(overrides?: { trainingMode?: string; melodySelected?: boolean }) {
  const practiceSummary = vi.fn();
  const sessionSummary = vi.fn();
  const melodySummary = vi.fn();
  const selectedMelody =
    overrides?.melodySelected === false
      ? null
      : {
          id: 'melody-1',
          name: 'Romanza',
          events: [{ notes: [{ note: 'C' }] }],
        };

  return {
    deps: {
      dom: {
        trainingMode: createSelect(overrides?.trainingMode ?? 'melody', 'Melodies (Follow the Notes)'),
        difficulty: createSelect('natural', 'Natural Notes Only'),
        curriculumPreset: createSelect('custom', 'Custom'),
        sessionGoal: createSelect('10-correct', '10 Correct'),
        sessionPace: createSelect('ultra', 'Ultra'),
        startFret: createInput('0'),
        endFret: createInput('24'),
        stringSelector: {} as HTMLElement,
        scaleSelector: createSelect('C major', 'C major'),
        chordSelector: createSelect('C', 'C'),
        progressionSelector: createSelect('I-V-vi-IV', 'I-V-vi-IV'),
        arpeggioPatternSelector: createSelect('up-down', 'Up/Down'),
        melodySelector: createSelect('melody-1', 'Romanza'),
        melodyShowNote: createInput('', true),
      },
      state: {
        currentInstrument: { STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
        melodyTransposeSemitones: -2,
        melodyStringShift: 1,
        melodyLoopRangeEnabled: true,
      },
      getEnabledStringsCount: vi.fn(() => 2),
      getSelectedMelody: vi.fn(() => selectedMelody),
      getStoredMelodyStudyRangeText: vi.fn(() => 'Steps 1-8'),
      isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
      formatMelodyTransposeSemitones: vi.fn(() => '-2 st'),
      formatMelodyStringShift: vi.fn(() => '+1 str'),
      setPracticeSetupSummary: practiceSummary,
      setSessionToolsSummary: sessionSummary,
      setMelodySetupSummary: melodySummary,
    },
    practiceSummary,
    sessionSummary,
    melodySummary,
  };
}

describe('practice-setup-summary-controller', () => {
  it('formats melody workflow summaries', () => {
    const { deps, practiceSummary, sessionSummary, melodySummary } = createDeps();
    const controller = createPracticeSetupSummaryController(deps);

    controller.update();

    expect(practiceSummary).toHaveBeenCalledWith('Melodies (Follow the Notes) | Natural Notes Only');
    expect(sessionSummary).toHaveBeenCalledWith('Frets 0-24 | Strings 2/6 | 10 Correct | Pace: Ultra | Custom');
    expect(melodySummary).toHaveBeenCalledWith(
      'Melody: Romanza | Transpose -2 st | Shift +1 str | Steps 1-8 | Loop On | Hint On'
    );
  });

  it('clears melody summary outside melody workflow modes', () => {
    const { deps, melodySummary } = createDeps({ trainingMode: 'scales' });
    const controller = createPracticeSetupSummaryController(deps);

    controller.update();

    expect(melodySummary).toHaveBeenCalledWith('');
  });
});
