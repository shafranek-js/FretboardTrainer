import { describe, expect, it, vi } from 'vitest';
import type { MelodyStudyRange } from '../melody-study-range';
import { createMelodyPracticeSettingsBridgeController } from './melody-practice-settings-bridge-controller';

function createDeps() {
  const range: MelodyStudyRange = { startIndex: 1, endIndex: 3 };
  return {
    range,
    getStoredMelodyStudyRange: vi.fn(() => range),
    syncMelodyLoopRangeDisplay: vi.fn(),
    hydrateMelodyTransposeForSelectedMelody: vi.fn(),
    hydrateMelodyStringShiftForSelectedMelody: vi.fn(),
    hydrateMelodyStudyRangeForSelectedMelody: vi.fn(),
    applyMelodyTransposeSemitones: vi.fn(() => true),
    applyMelodyStringShift: vi.fn(() => ({ changed: true, valid: true })),
    applyMelodyStudyRange: vi.fn(() => true),
    setStoredMelodyTransposeSemitones: vi.fn(() => 5),
    refreshMelodyOptionsForCurrentInstrument: vi.fn(),
  };
}

describe('melody-practice-settings-bridge-controller', () => {
  it('delegates hydration and display helpers', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeSettingsBridgeController(deps);

    expect(controller.getStoredMelodyStudyRange('melody-1', 8)).toEqual(deps.range);
    controller.syncMelodyLoopRangeDisplay();
    controller.hydrateMelodyTransposeForSelectedMelody({ migrateLegacyValue: true });
    controller.hydrateMelodyStringShiftForSelectedMelody();
    controller.hydrateMelodyStudyRangeForSelectedMelody();
    controller.refreshMelodyOptionsForCurrentInstrument();

    expect(deps.getStoredMelodyStudyRange).toHaveBeenCalledWith('melody-1', 8);
    expect(deps.syncMelodyLoopRangeDisplay).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyTransposeForSelectedMelody).toHaveBeenCalledWith({ migrateLegacyValue: true });
    expect(deps.hydrateMelodyStringShiftForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyStudyRangeForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyOptionsForCurrentInstrument).toHaveBeenCalledTimes(1);
  });

  it('delegates practice adjustment mutations', () => {
    const deps = createDeps();
    const controller = createMelodyPracticeSettingsBridgeController(deps);

    expect(controller.applyMelodyTransposeSemitones(2)).toBe(true);
    expect(controller.applyMelodyStringShift(-1)).toEqual({ changed: true, valid: true });
    expect(controller.applyMelodyStudyRange({ startIndex: 2 })).toBe(true);
    expect(controller.setStoredMelodyTransposeSemitones('melody-1', 5)).toBe(5);

    expect(deps.applyMelodyTransposeSemitones).toHaveBeenCalledWith(2);
    expect(deps.applyMelodyStringShift).toHaveBeenCalledWith(-1);
    expect(deps.applyMelodyStudyRange).toHaveBeenCalledWith({ startIndex: 2 });
    expect(deps.setStoredMelodyTransposeSemitones).toHaveBeenCalledWith('melody-1', 5);
  });
});
