import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition } from '../melody-library';

interface MelodySetupUiState {
  currentInstrument: IInstrument;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
  melodyStudyRangeStartIndex: number;
  melodyStudyRangeEndIndex: number;
}

interface MelodySetupUiDom {
  trainingMode: HTMLSelectElement;
  melodyPlaybackControls: HTMLElement;
  editMelodyBtn: HTMLButtonElement;
  exportMelodyMidiBtn: HTMLButtonElement;
  exportPracticeMelodyMidiBtn: HTMLButtonElement;
  melodyDemoBtn: HTMLButtonElement;
  melodyStepBackBtn: HTMLButtonElement;
  melodyStepForwardBtn: HTMLButtonElement;
  melodyTransposeResetBtn: HTMLButtonElement;
  melodyStringShiftResetBtn: HTMLButtonElement;
  melodyTransposeBatchCustomBtn: HTMLButtonElement;
  melodyStringShift: HTMLInputElement;
  melodyStringShiftDownBtn: HTMLButtonElement;
  melodyStringShiftUpBtn: HTMLButtonElement;
  melodyStudyStart: HTMLInputElement;
  melodyStudyEnd: HTMLInputElement;
  melodyStudyResetBtn: HTMLButtonElement;
  deleteMelodyBtn: HTMLButtonElement;
}

interface MelodySetupUiControllerDeps {
  dom: MelodySetupUiDom;
  state: MelodySetupUiState;
  getSelectedMelody(): MelodyDefinition | null;
  getSelectedMelodyId(): string | null;
  listMelodies(): MelodyDefinition[];
  getAdjustedMelody(melody: MelodyDefinition, stringShift: number): MelodyDefinition;
  isStringShiftFeasible(melody: MelodyDefinition, nextShift: number): boolean;
  isMelodyWorkflowMode(mode: string): boolean;
  isDemoActive(): boolean;
  isCustomMelodyId(melodyId: string | null): boolean;
  isDefaultStudyRange(totalEvents: number): boolean;
  renderTimeline(): void;
}

export function createMelodySetupUiController(deps: MelodySetupUiControllerDeps) {
  function updateActionButtons() {
    const selectedMelodyId = deps.getSelectedMelodyId();
    const melody = deps.getSelectedMelody();
    const transposedMelody = melody ? deps.getAdjustedMelody(melody, 0) : null;
    const adjustedMelody = melody ? deps.getAdjustedMelody(melody, deps.state.melodyStringShift) : null;
    const customMelodies = deps.listMelodies().filter((entry) => entry.source === 'custom');

    deps.dom.melodyPlaybackControls.classList.toggle(
      'hidden',
      !deps.isMelodyWorkflowMode(deps.dom.trainingMode.value)
    );
    deps.dom.editMelodyBtn.disabled = !melody || (melody.source !== 'custom' && typeof melody.tabText !== 'string');
    deps.dom.exportMelodyMidiBtn.disabled = !melody || melody.source !== 'custom';
    deps.dom.exportPracticeMelodyMidiBtn.disabled = !adjustedMelody || adjustedMelody.events.length === 0;
    deps.dom.melodyDemoBtn.disabled = !melody;
    const canStep = Boolean(melody) && !deps.isDemoActive();
    deps.dom.melodyStepBackBtn.disabled = !canStep;
    deps.dom.melodyStepForwardBtn.disabled = !canStep;
    deps.dom.melodyTransposeResetBtn.disabled = !melody || deps.state.melodyTransposeSemitones === 0;
    deps.dom.melodyStringShiftResetBtn.disabled = !melody || deps.state.melodyStringShift === 0;
    deps.dom.melodyTransposeBatchCustomBtn.disabled = customMelodies.length === 0;
    deps.dom.melodyStringShift.disabled = !melody;
    deps.dom.melodyStringShiftDownBtn.disabled =
      !transposedMelody || !deps.isStringShiftFeasible(transposedMelody, deps.state.melodyStringShift - 1);
    deps.dom.melodyStringShiftUpBtn.disabled =
      !transposedMelody || !deps.isStringShiftFeasible(transposedMelody, deps.state.melodyStringShift + 1);
    deps.dom.melodyStudyStart.disabled = !melody;
    deps.dom.melodyStudyEnd.disabled = !melody;
    deps.dom.melodyStudyResetBtn.disabled = !melody || deps.isDefaultStudyRange(melody.events.length);
    deps.dom.deleteMelodyBtn.disabled = !deps.isCustomMelodyId(selectedMelodyId);
    deps.renderTimeline();
  }

  return {
    updateActionButtons,
  };
}
