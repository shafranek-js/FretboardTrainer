import { createCurriculumPresetBridgeController } from '../curriculum-preset-bridge-controller';
import { createCurriculumPresetController } from '../curriculum-preset-controller';

interface SessionCurriculumPresetClusterDeps {
  curriculumPreset: Parameters<typeof createCurriculumPresetController>[0];
}

export function createSessionCurriculumPresetCluster(deps: SessionCurriculumPresetClusterDeps) {
  const curriculumPresetController = createCurriculumPresetController(deps.curriculumPreset);
  const curriculumPresetBridgeController = createCurriculumPresetBridgeController({
    setPresetInfo: (text) => curriculumPresetController.setPresetInfo(text),
    setSelection: (key) => curriculumPresetController.setSelection(key),
    markAsCustom: () => curriculumPresetController.markAsCustom(),
    applyPreset: (key) => curriculumPresetController.applyPreset(key),
  });

  return {
    curriculumPresetController,
    curriculumPresetBridgeController,
  };
}

