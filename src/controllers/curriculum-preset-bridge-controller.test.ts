import { describe, expect, it, vi } from 'vitest';
import type { CurriculumPresetKey } from '../curriculum-presets';
import { createCurriculumPresetBridgeController } from './curriculum-preset-bridge-controller';

function createDeps() {
  return {
    setPresetInfo: vi.fn(),
    setSelection: vi.fn(),
    markAsCustom: vi.fn(),
    applyPreset: vi.fn(),
  };
}

describe('curriculum-preset-bridge-controller', () => {
  it('delegates curriculum preset interactions', () => {
    const deps = createDeps();
    const controller = createCurriculumPresetBridgeController(deps);

    controller.setPresetInfo('Preset info');
    controller.setSelection('custom' as CurriculumPresetKey);
    controller.markAsCustom();
    controller.applyPreset('custom' as CurriculumPresetKey);

    expect(deps.setPresetInfo).toHaveBeenCalledWith('Preset info');
    expect(deps.setSelection).toHaveBeenCalledWith('custom');
    expect(deps.markAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.applyPreset).toHaveBeenCalledWith('custom');
  });
});
