import type { CurriculumPresetKey } from '../curriculum-presets';

export interface CurriculumPresetBridgeControllerDeps {
  setPresetInfo: (text: string) => void;
  setSelection: (key: CurriculumPresetKey) => void;
  markAsCustom: () => void;
  applyPreset: (key: CurriculumPresetKey) => void;
}

export function createCurriculumPresetBridgeController(
  deps: CurriculumPresetBridgeControllerDeps
) {
  return {
    setPresetInfo: (text: string) => deps.setPresetInfo(text),
    setSelection: (key: CurriculumPresetKey) => deps.setSelection(key),
    markAsCustom: () => deps.markAsCustom(),
    applyPreset: (key: CurriculumPresetKey) => deps.applyPreset(key),
  };
}
