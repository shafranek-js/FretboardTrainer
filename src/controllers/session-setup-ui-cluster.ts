import { createMelodySetupUiController } from './melody-setup-ui-controller';
import { createPracticePresetUiController } from './practice-preset-ui-controller';
import { createPracticeSetupSummaryController } from './practice-setup-summary-controller';

interface SessionSetupUiClusterDeps {
  melodySetupUi: Parameters<typeof createMelodySetupUiController>[0];
  practiceSetupSummary: Parameters<typeof createPracticeSetupSummaryController>[0];
  practicePresetUi: Parameters<typeof createPracticePresetUiController>[0];
}

export function createSessionSetupUiCluster(deps: SessionSetupUiClusterDeps) {
  const melodySetupUiController = createMelodySetupUiController(deps.melodySetupUi);
  const practiceSetupSummaryController = createPracticeSetupSummaryController(deps.practiceSetupSummary);
  const practicePresetUiController = createPracticePresetUiController(deps.practicePresetUi);

  return {
    melodySetupUiController,
    practiceSetupSummaryController,
    practicePresetUiController,
  };
}
