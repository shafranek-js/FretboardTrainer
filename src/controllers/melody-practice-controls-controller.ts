import type { MelodyStudyRange } from '../melody-study-range';

interface MelodyPracticeControlsDom {
  melodyTranspose: HTMLInputElement;
  melodyTransposeDownBtn: HTMLButtonElement;
  melodyTransposeUpBtn: HTMLButtonElement;
  melodyTransposeResetBtn: HTMLButtonElement;
  melodyStringShift: HTMLInputElement;
  melodyStringShiftDownBtn: HTMLButtonElement;
  melodyStringShiftUpBtn: HTMLButtonElement;
  melodyStringShiftResetBtn: HTMLButtonElement;
  melodyTransposeBatchCustomBtn: HTMLButtonElement;
  melodyStudyStart: HTMLInputElement;
  melodyStudyEnd: HTMLInputElement;
}

interface MelodyPracticeControlsState {
  melodyTransposeSemitones: number;
  melodyStringShift: number;
}

export interface MelodyPracticeControlsControllerDeps {
  dom: MelodyPracticeControlsDom;
  state: MelodyPracticeControlsState;
  normalizeMelodyTransposeSemitones: (value: unknown) => number;
  normalizeMelodyStringShift: (value: unknown) => number;
  handleTransposeInputChange: (value: unknown) => void;
  handleStringShiftInputChange: (value: unknown) => void;
  applyCurrentTransposeToAllCustomMelodies: () => Promise<void>;
  handleStudyRangeChange: (range: Partial<MelodyStudyRange>, options?: { stopMessage?: string }) => boolean;
  stopMelodyDemoPlayback: (options: { clearUi: boolean }) => void;
}

export function createMelodyPracticeControlsController(deps: MelodyPracticeControlsControllerDeps) {
  function register() {
    deps.dom.melodyTranspose.addEventListener('input', () => {
      deps.handleTransposeInputChange(deps.dom.melodyTranspose.value);
    });

    deps.dom.melodyTranspose.addEventListener('change', () => {
      deps.handleTransposeInputChange(deps.dom.melodyTranspose.value);
    });

    deps.dom.melodyTransposeDownBtn.addEventListener('click', () => {
      deps.dom.melodyTranspose.value = String(
        deps.normalizeMelodyTransposeSemitones(deps.state.melodyTransposeSemitones - 1)
      );
      deps.dom.melodyTranspose.dispatchEvent(new Event('input'));
    });

    deps.dom.melodyTransposeUpBtn.addEventListener('click', () => {
      deps.dom.melodyTranspose.value = String(
        deps.normalizeMelodyTransposeSemitones(deps.state.melodyTransposeSemitones + 1)
      );
      deps.dom.melodyTranspose.dispatchEvent(new Event('input'));
    });

    deps.dom.melodyTransposeResetBtn.addEventListener('click', () => {
      if (deps.state.melodyTransposeSemitones === 0) return;
      deps.dom.melodyTranspose.value = '0';
      deps.dom.melodyTranspose.dispatchEvent(new Event('input'));
    });

    deps.dom.melodyStringShift.addEventListener('input', () => {
      deps.handleStringShiftInputChange(deps.dom.melodyStringShift.value);
    });

    deps.dom.melodyStringShift.addEventListener('change', () => {
      deps.handleStringShiftInputChange(deps.dom.melodyStringShift.value);
    });

    deps.dom.melodyStringShiftDownBtn.addEventListener('click', () => {
      deps.dom.melodyStringShift.value = String(
        deps.normalizeMelodyStringShift(deps.state.melodyStringShift - 1)
      );
      deps.dom.melodyStringShift.dispatchEvent(new Event('input'));
    });

    deps.dom.melodyStringShiftUpBtn.addEventListener('click', () => {
      deps.dom.melodyStringShift.value = String(
        deps.normalizeMelodyStringShift(deps.state.melodyStringShift + 1)
      );
      deps.dom.melodyStringShift.dispatchEvent(new Event('input'));
    });

    deps.dom.melodyStringShiftResetBtn.addEventListener('click', () => {
      if (deps.state.melodyStringShift === 0) return;
      deps.dom.melodyStringShift.value = '0';
      deps.dom.melodyStringShift.dispatchEvent(new Event('input'));
    });

    deps.dom.melodyTransposeBatchCustomBtn.addEventListener('click', async () => {
      deps.stopMelodyDemoPlayback({ clearUi: true });
      await deps.applyCurrentTransposeToAllCustomMelodies();
    });

    deps.dom.melodyStudyStart.addEventListener('change', () => {
      deps.handleStudyRangeChange(
        {
          startIndex: Number.parseInt(deps.dom.melodyStudyStart.value, 10) - 1,
          endIndex: Number.parseInt(deps.dom.melodyStudyEnd.value, 10) - 1,
        },
        {
          stopMessage: 'Study range changed. Session stopped; press Start to continue.',
        }
      );
    });

    deps.dom.melodyStudyEnd.addEventListener('change', () => {
      deps.dom.melodyStudyStart.dispatchEvent(new Event('change'));
    });
  }

  return {
    register,
  };
}
