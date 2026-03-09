import { describe, expect, it, vi } from 'vitest';
import { createMelodyPracticeControlsController } from './melody-practice-controls-controller';

type Listener = () => void | Promise<void>;

type MockControl = {
  listeners: Record<string, Listener>;
  value: string;
  checked: boolean;
  dispatchEvent: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function createControl(value = '', checked = false): MockControl {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    checked,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  };
}

function createDeps() {
  return {
    dom: {
      melodyTranspose: createControl('2'),
      melodyTransposeDownBtn: createControl(),
      melodyTransposeUpBtn: createControl(),
      melodyTransposeResetBtn: createControl(),
      melodyStringShift: createControl('1'),
      melodyStringShiftDownBtn: createControl(),
      melodyStringShiftUpBtn: createControl(),
      melodyStringShiftResetBtn: createControl(),
      melodyTransposeBatchCustomBtn: createControl(),
      melodyStudyStart: createControl('3'),
      melodyStudyEnd: createControl('6'),
    },
    state: {
      melodyTransposeSemitones: 2,
      melodyStringShift: 1,
    },
    normalizeMelodyTransposeSemitones: vi.fn((value: unknown) => Number(value)),
    normalizeMelodyStringShift: vi.fn((value: unknown) => Number(value)),
    handleTransposeInputChange: vi.fn(),
    handleStringShiftInputChange: vi.fn(),
    applyCurrentTransposeToAllCustomMelodies: vi.fn(async () => {}),
    handleStudyRangeChange: vi.fn(() => true),
    stopMelodyDemoPlayback: vi.fn(),
  };
}

describe('melody-practice-controls-controller', () => {
  it('forwards transpose input and change events to the practice actions controller', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeControlsController(deps as never);

    controller.register();
    deps.dom.melodyTranspose.listeners.input();
    deps.dom.melodyTranspose.listeners.change();

    expect(deps.handleTransposeInputChange).toHaveBeenCalledTimes(2);
    expect(deps.handleTransposeInputChange).toHaveBeenCalledWith('2');
  });

  it('increments, decrements, and resets transpose through the shared input flow', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeControlsController(deps as never);

    controller.register();
    deps.dom.melodyTransposeDownBtn.listeners.click();
    deps.dom.melodyTransposeUpBtn.listeners.click();
    deps.dom.melodyTransposeResetBtn.listeners.click();

    expect(deps.normalizeMelodyTransposeSemitones).toHaveBeenNthCalledWith(1, 1);
    expect(deps.normalizeMelodyTransposeSemitones).toHaveBeenNthCalledWith(2, 3);
    expect(deps.dom.melodyTranspose.dispatchEvent).toHaveBeenCalledTimes(3);
    expect(deps.dom.melodyTranspose.value).toBe('0');
  });

  it('forwards string shift input and change events to the practice actions controller', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeControlsController(deps as never);

    controller.register();
    deps.dom.melodyStringShift.listeners.input();
    deps.dom.melodyStringShift.listeners.change();

    expect(deps.handleStringShiftInputChange).toHaveBeenCalledTimes(2);
    expect(deps.handleStringShiftInputChange).toHaveBeenCalledWith('1');
  });

  it('increments, decrements, and resets string shift through the shared input flow', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeControlsController(deps as never);

    controller.register();
    deps.dom.melodyStringShiftDownBtn.listeners.click();
    deps.dom.melodyStringShiftUpBtn.listeners.click();
    deps.dom.melodyStringShiftResetBtn.listeners.click();

    expect(deps.normalizeMelodyStringShift).toHaveBeenNthCalledWith(1, 0);
    expect(deps.normalizeMelodyStringShift).toHaveBeenNthCalledWith(2, 2);
    expect(deps.dom.melodyStringShift.dispatchEvent).toHaveBeenCalledTimes(3);
    expect(deps.dom.melodyStringShift.value).toBe('0');
  });

  it('runs batch transpose via the shared practice action flow', async () => {
    const deps = createDeps();
    const controller = createMelodyPracticeControlsController(deps as never);

    controller.register();
    await deps.dom.melodyTransposeBatchCustomBtn.listeners.click();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.applyCurrentTransposeToAllCustomMelodies).toHaveBeenCalledTimes(1);
  });

  it('routes study range changes and mirrors end changes through the start input', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeControlsController(deps as never);

    controller.register();
    deps.dom.melodyStudyStart.listeners.change();
    deps.dom.melodyStudyEnd.listeners.change();

    expect(deps.handleStudyRangeChange).toHaveBeenCalledWith(
      { startIndex: 2, endIndex: 5 },
      { stopMessage: 'Study range changed. Session stopped; press Start to continue.' }
    );
    expect(deps.dom.melodyStudyStart.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});
