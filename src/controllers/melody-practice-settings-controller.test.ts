import { beforeEach, describe, expect, it, vi } from 'vitest';
import { instruments } from '../instruments';
import { createMelodyPracticeSettingsController } from './melody-practice-settings-controller';

const melodyLibraryMocks = vi.hoisted(() => ({
  listMelodiesForInstrument: vi.fn(),
  getMelodyById: vi.fn(),
}));

vi.mock('../melody-library', () => ({
  listMelodiesForInstrument: melodyLibraryMocks.listMelodiesForInstrument,
  getMelodyById: melodyLibraryMocks.getMelodyById,
}));

function createDom() {
  const options: Array<{ value: string; textContent: string }> = [];
  const melodySelector = {
    value: '',
    options,
    append(option: { value: string; textContent: string }) {
      options.push(option);
    },
    set innerHTML(value: string) {
      if (value === '') {
        options.splice(0, options.length);
      }
    },
    get innerHTML() {
      return '';
    },
  };
  const melodyTranspose = { value: '' };
  const melodyTransposeValue = { textContent: '' };
  const melodyStringShift = { value: '', min: '', max: '' };
  const melodyStringShiftValue = { textContent: '' };
  const melodyStudyStart = { value: '', min: '', max: '', disabled: false };
  const melodyStudyEnd = { value: '', min: '', max: '', disabled: false };
  const melodyStudyValue = { textContent: '' };
  const melodyStudyResetBtn = { disabled: false };
  const melodyLoopRange = { checked: false, disabled: false };
  return {
    melodySelector: melodySelector as unknown as HTMLSelectElement,
    melodyTranspose: melodyTranspose as unknown as HTMLInputElement,
    melodyTransposeValue: melodyTransposeValue as unknown as HTMLElement,
    melodyStringShift: melodyStringShift as unknown as HTMLInputElement,
    melodyStringShiftValue: melodyStringShiftValue as unknown as HTMLElement,
    melodyStudyStart: melodyStudyStart as unknown as HTMLInputElement,
    melodyStudyEnd: melodyStudyEnd as unknown as HTMLInputElement,
    melodyStudyValue: melodyStudyValue as unknown as HTMLElement,
    melodyStudyResetBtn: melodyStudyResetBtn as unknown as HTMLButtonElement,
    melodyLoopRange: melodyLoopRange as unknown as HTMLInputElement,
  };
}

function createState() {
  return {
    preferredMelodyId: null,
    currentInstrument: instruments.guitar,
    melodyTransposeById: {},
    melodyTransposeSemitones: 2,
    melodyStringShiftById: {},
    melodyStringShift: 0,
    melodyStudyRangeById: {},
    melodyStudyRangeStartIndex: 0,
    melodyStudyRangeEndIndex: 0,
    melodyLoopRangeEnabled: true,
  };
}

describe('melody-practice-settings-controller', () => {
  beforeEach(() => {
    melodyLibraryMocks.listMelodiesForInstrument.mockReset();
    melodyLibraryMocks.getMelodyById.mockReset();
  });

  it('migrates legacy transpose to the selected melody and updates selector labels', () => {
    const dom = createDom();
    const state = createState();
    const melody = { id: 'melody-1', name: 'Romanza', source: 'custom', events: [{ notes: [{ note: 'C' }] }] };
    dom.melodySelector.append({ textContent: 'Romanza', value: 'melody-1' } as HTMLOptionElement);
    dom.melodySelector.value = 'melody-1';
    melodyLibraryMocks.listMelodiesForInstrument.mockReturnValue([melody]);
    melodyLibraryMocks.getMelodyById.mockReturnValue(melody);

    const controller = createMelodyPracticeSettingsController({
      dom,
      state,
      clearPreviewState: vi.fn(),
      renderTimeline: vi.fn(),
    });

    controller.hydrateMelodyTransposeForSelectedMelody({ migrateLegacyValue: true });

    expect(state.melodyTransposeById).toEqual({ 'melody-1': 2 });
    expect(dom.melodyTransposeValue.textContent).toBe('+2 st');
    expect(dom.melodySelector.options[0]?.textContent).toContain('[+2 st]');
  });

  it('applies transpose and triggers preview/timeline refresh', () => {
    const dom = createDom();
    const state = createState();
    const melody = {
      id: 'melody-1',
      name: 'Romanza',
      source: 'custom',
      events: [{ notes: [{ note: 'C', stringName: 'A', fret: 3 }] }],
    };
    const clearPreviewState = vi.fn();
    const renderTimeline = vi.fn();
    dom.melodySelector.append({ textContent: 'Romanza', value: 'melody-1' } as HTMLOptionElement);
    dom.melodySelector.value = 'melody-1';
    melodyLibraryMocks.getMelodyById.mockReturnValue(melody);

    const controller = createMelodyPracticeSettingsController({
      dom,
      state,
      clearPreviewState,
      renderTimeline,
    });

    const changed = controller.applyMelodyTransposeSemitones(-3);

    expect(changed).toBe(true);
    expect(state.melodyTransposeSemitones).toBe(-3);
    expect(clearPreviewState).toHaveBeenCalledTimes(1);
    expect(renderTimeline).toHaveBeenCalledTimes(1);
  });

  it('applies study range and updates controls from melody event count', () => {
    const dom = createDom();
    const state = createState();
    const melody = {
      id: 'melody-1',
      name: 'Romanza',
      source: 'custom',
      events: [
        { notes: [{ note: 'C', stringName: 'A', fret: 3 }] },
        { notes: [{ note: 'D', stringName: 'A', fret: 5 }] },
        { notes: [{ note: 'E', stringName: 'A', fret: 7 }] },
      ],
    };
    const clearPreviewState = vi.fn();
    const renderTimeline = vi.fn();
    dom.melodySelector.append({ textContent: 'Romanza', value: 'melody-1' } as HTMLOptionElement);
    dom.melodySelector.value = 'melody-1';
    melodyLibraryMocks.getMelodyById.mockReturnValue(melody);

    const controller = createMelodyPracticeSettingsController({
      dom,
      state,
      clearPreviewState,
      renderTimeline,
    });

    const changed = controller.applyMelodyStudyRange({ startIndex: 1, endIndex: 2 });

    expect(changed).toBe(true);
    expect(state.melodyStudyRangeStartIndex).toBe(1);
    expect(state.melodyStudyRangeEndIndex).toBe(2);
    expect(dom.melodyStudyStart.value).toBe('2');
    expect(dom.melodyStudyEnd.value).toBe('3');
    expect(dom.melodyStudyValue.textContent).toContain('2 steps');
    expect(clearPreviewState).toHaveBeenCalledTimes(1);
    expect(renderTimeline).toHaveBeenCalledTimes(1);
  });
});
