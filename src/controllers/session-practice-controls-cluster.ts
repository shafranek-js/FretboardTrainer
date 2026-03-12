import { createInstrumentDisplayControlsController } from './instrument-display-controls-controller';
import { createPracticePresetControlsController } from './practice-preset-controls-controller';
import { createPracticeSetupControlsController } from './practice-setup-controls-controller';

interface SessionPracticeControlsClusterDeps {
  practicePresetControls: Parameters<typeof createPracticePresetControlsController>[0];
  practiceSetupControls: Parameters<typeof createPracticeSetupControlsController>[0];
  instrumentDisplayControls: Parameters<typeof createInstrumentDisplayControlsController>[0];
}

export function createSessionPracticeControlsCluster(deps: SessionPracticeControlsClusterDeps) {
  const practicePresetControlsController = createPracticePresetControlsController(deps.practicePresetControls);
  const practiceSetupControlsController = createPracticeSetupControlsController(deps.practiceSetupControls);
  const instrumentDisplayControlsController = createInstrumentDisplayControlsController(
    deps.instrumentDisplayControls
  );

  return {
    practicePresetControlsController,
    practiceSetupControlsController,
    instrumentDisplayControlsController,
  };
}
