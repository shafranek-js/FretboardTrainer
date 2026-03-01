import { describe, expect, it, vi } from 'vitest';
import { createMelodySetupUiController } from './melody-setup-ui-controller';

class FakeClassList {
  private values = new Set<string>();

  toggle(token: string, force?: boolean) {
    if (force === true) {
      this.values.add(token);
      return true;
    }
    if (force === false) {
      this.values.delete(token);
      return false;
    }
    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }
    this.values.add(token);
    return true;
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

function createButton() {
  return { disabled: false, classList: new FakeClassList() } as unknown as HTMLButtonElement;
}

function createInput() {
  return { disabled: false, value: '', classList: new FakeClassList() } as unknown as HTMLInputElement;
}

function createSelect(value: string) {
  return { value, classList: new FakeClassList() } as unknown as HTMLSelectElement;
}

function createDeps(overrides?: {
  selectedMelody?: { id: string; name: string; source: 'builtin' | 'custom'; tabText?: string; events: Array<unknown> } | null;
  demoActive?: boolean;
  trainingMode?: string;
}) {
  const dom = {
    trainingMode: createSelect(overrides?.trainingMode ?? 'melody'),
    melodyPlaybackControls: { classList: new FakeClassList() } as unknown as HTMLElement,
    editMelodyBtn: createButton(),
    exportMelodyMidiBtn: createButton(),
    bakePracticeMelodyBtn: createButton(),
    melodyDemoBtn: createButton(),
    melodyStepBackBtn: createButton(),
    melodyStepForwardBtn: createButton(),
    melodyTransposeResetBtn: createButton(),
    melodyStringShiftResetBtn: createButton(),
    melodyTransposeBatchCustomBtn: createButton(),
    melodyStringShift: createInput(),
    melodyStringShiftDownBtn: createButton(),
    melodyStringShiftUpBtn: createButton(),
    melodyStudyStart: createInput(),
    melodyStudyEnd: createInput(),
    melodyStudyResetBtn: createButton(),
    deleteMelodyBtn: createButton(),
  };

  const selectedMelody = overrides?.selectedMelody ?? null;
  const deps = {
    dom,
    state: {
      currentInstrument: { STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
      melodyTransposeSemitones: 0,
      melodyStringShift: 0,
      melodyStudyRangeStartIndex: 0,
      melodyStudyRangeEndIndex: 0,
    },
    getSelectedMelody: vi.fn(() => selectedMelody),
    getSelectedMelodyId: vi.fn(() => selectedMelody?.id ?? null),
    listMelodies: vi.fn(() => (selectedMelody ? [selectedMelody] : [])),
    getAdjustedMelody: vi.fn((melody, _stringShift) => melody),
    isStringShiftFeasible: vi.fn(() => true),
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    isDemoActive: vi.fn(() => overrides?.demoActive ?? false),
    isCustomMelodyId: vi.fn((melodyId: string | null) => melodyId?.startsWith('custom:') ?? false),
    isDefaultStudyRange: vi.fn(() => true),
    renderTimeline: vi.fn(),
  };

  return { deps, dom };
}

describe('melody-setup-ui-controller', () => {
  it('disables melody actions when nothing is selected', () => {
    const { deps, dom } = createDeps();
    const controller = createMelodySetupUiController(deps);

    controller.updateActionButtons();

    expect(dom.editMelodyBtn.disabled).toBe(true);
    expect(dom.exportMelodyMidiBtn.disabled).toBe(true);
    expect(dom.bakePracticeMelodyBtn.disabled).toBe(true);
    expect(dom.melodyDemoBtn.disabled).toBe(true);
    expect(dom.deleteMelodyBtn.disabled).toBe(true);
    expect(deps.renderTimeline).toHaveBeenCalledTimes(1);
  });

  it('keeps step buttons disabled while demo is active and enables custom actions', () => {
    const selectedMelody = {
      id: 'custom:romanza',
      name: 'Romanza',
      source: 'custom' as const,
      tabText: 'E|--0--|',
      events: [{ notes: [{ note: 'C' }] }],
    };
    const { deps, dom } = createDeps({ selectedMelody, demoActive: true });
    const controller = createMelodySetupUiController(deps);

    controller.updateActionButtons();

    expect(dom.editMelodyBtn.disabled).toBe(false);
    expect(dom.exportMelodyMidiBtn.disabled).toBe(false);
    expect(dom.bakePracticeMelodyBtn.disabled).toBe(true);
    expect(dom.melodyStepBackBtn.disabled).toBe(true);
    expect(dom.melodyStepForwardBtn.disabled).toBe(true);
    expect(dom.deleteMelodyBtn.disabled).toBe(false);
  });

  it('enables bake when practice adjustments are active', () => {
    const selectedMelody = {
      id: 'builtin:romanza',
      name: 'Romanza',
      source: 'builtin' as const,
      tabText: 'E|--0--|',
      events: [{ notes: [{ note: 'C' }] }],
    };
    const { deps, dom } = createDeps({ selectedMelody });
    deps.state.melodyTransposeSemitones = 2;
    const controller = createMelodySetupUiController(deps);

    controller.updateActionButtons();

    expect(dom.bakePracticeMelodyBtn.disabled).toBe(false);
  });
});
