import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition } from '../melody-library';

interface PracticeSetupSummaryState {
  currentInstrument: IInstrument;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
  melodyLoopRangeEnabled: boolean;
}

interface PracticeSetupSummaryDom {
  trainingMode: HTMLSelectElement;
  difficulty: HTMLSelectElement;
  curriculumPreset: HTMLSelectElement;
  sessionGoal: HTMLSelectElement;
  sessionPace: HTMLSelectElement;
  startFret: HTMLInputElement;
  endFret: HTMLInputElement;
  stringSelector: HTMLElement;
  scaleSelector: HTMLSelectElement;
  chordSelector: HTMLSelectElement;
  progressionSelector: HTMLSelectElement;
  arpeggioPatternSelector: HTMLSelectElement;
  melodySelector: HTMLSelectElement;
  melodyShowNote: HTMLInputElement;
}

interface PracticeSetupSummaryControllerDeps {
  dom: PracticeSetupSummaryDom;
  state: PracticeSetupSummaryState;
  getEnabledStringsCount(): number;
  getSelectedMelody(): MelodyDefinition | null;
  getStoredMelodyStudyRangeText(melody: MelodyDefinition): string;
  isMelodyWorkflowMode(mode: string): boolean;
  formatMelodyTransposeSemitones(value: number): string;
  formatMelodyStringShift(value: number): string;
  setPracticeSetupSummary(value: string): void;
  setSessionToolsSummary(value: string): void;
  setMelodySetupSummary(value: string): void;
}

export function createPracticeSetupSummaryController(deps: PracticeSetupSummaryControllerDeps) {
  function update() {
    const modeLabel = deps.dom.trainingMode.selectedOptions[0]?.textContent?.trim() ?? 'Mode';
    const difficultyLabel =
      deps.dom.difficulty.selectedOptions[0]?.textContent?.trim() ?? deps.dom.difficulty.value;
    const curriculumLabel =
      deps.dom.curriculumPreset.selectedOptions[0]?.textContent?.trim() ?? 'Custom';
    const goalLabel = deps.dom.sessionGoal.selectedOptions[0]?.textContent?.trim() ?? 'No Goal';
    const paceLabel = deps.dom.sessionPace.selectedOptions[0]?.textContent?.trim() ?? 'Normal Pace';
    const fretRange = `${deps.dom.startFret.value}-${deps.dom.endFret.value}`;
    const enabledStringsCount = deps.getEnabledStringsCount();
    const totalStringsCount = deps.state.currentInstrument.STRING_ORDER.length;

    let modeDetail = '';
    if (deps.dom.trainingMode.value === 'scales') {
      modeDetail = ` | ${deps.dom.scaleSelector.value}`;
    } else if (deps.dom.trainingMode.value === 'chords') {
      modeDetail = ` | ${deps.dom.chordSelector.value}`;
    } else if (deps.dom.trainingMode.value === 'progressions') {
      modeDetail = ` | ${deps.dom.progressionSelector.value}`;
    } else if (deps.dom.trainingMode.value === 'arpeggios') {
      modeDetail = ` | ${
        deps.dom.arpeggioPatternSelector.selectedOptions[0]?.textContent?.trim() ??
        deps.dom.arpeggioPatternSelector.value
      }`;
    }

    deps.setPracticeSetupSummary(`${modeLabel}${modeDetail} | ${difficultyLabel}`);
    deps.setSessionToolsSummary(
      `Frets ${fretRange} | Strings ${enabledStringsCount}/${totalStringsCount} | ${goalLabel} | Pace: ${paceLabel} | ${curriculumLabel}`
    );

    if (deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)) {
      const melodyLabel =
        deps.dom.melodySelector.selectedOptions[0]?.textContent?.trim() ?? deps.dom.melodySelector.value;
      const selectedMelody = deps.getSelectedMelody();
      const studyRangeText = selectedMelody
        ? deps.getStoredMelodyStudyRangeText(selectedMelody)
        : 'No steps';
      const modePrefix = deps.dom.trainingMode.value === 'performance' ? 'Performance' : 'Melody';
      deps.setMelodySetupSummary(
        `${modePrefix}: ${melodyLabel || 'No melody selected'} | Transpose ${deps.formatMelodyTransposeSemitones(
          deps.state.melodyTransposeSemitones
        )} | Shift ${deps.formatMelodyStringShift(deps.state.melodyStringShift)} | ${studyRangeText} | ${
          deps.state.melodyLoopRangeEnabled ? 'Loop On' : 'Loop Off'
        } | ${deps.dom.melodyShowNote.checked ? 'Hint On' : 'Blind'}`
      );
      return;
    }

    deps.setMelodySetupSummary('');
  }

  return {
    update,
  };
}
