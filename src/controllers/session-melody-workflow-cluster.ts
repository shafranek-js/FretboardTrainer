import { createMelodyPracticeActionsController } from './melody-practice-actions-controller';
import { createMelodyPracticeControlsController } from './melody-practice-controls-controller';
import { createMelodySelectionController } from './melody-selection-controller';
import { createMelodySetupControlsController } from './melody-setup-controls-controller';

interface SessionMelodyWorkflowClusterDeps {
  melodySetupControls: Parameters<typeof createMelodySetupControlsController>[0];
  melodyPracticeActions: Parameters<typeof createMelodyPracticeActionsController>[0];
  melodyPracticeControls: Omit<
    Parameters<typeof createMelodyPracticeControlsController>[0],
    | 'handleTransposeInputChange'
    | 'handleStringShiftInputChange'
    | 'applyCurrentTransposeToAllCustomMelodies'
    | 'handleStudyRangeChange'
  >;
  melodySelection: Parameters<typeof createMelodySelectionController>[0];
}

export function createSessionMelodyWorkflowCluster(deps: SessionMelodyWorkflowClusterDeps) {
  const melodySetupControlsController = createMelodySetupControlsController(deps.melodySetupControls);
  const melodyPracticeActionsController = createMelodyPracticeActionsController(deps.melodyPracticeActions);
  const melodyPracticeControlsController = createMelodyPracticeControlsController({
    ...deps.melodyPracticeControls,
    handleTransposeInputChange: (value) => melodyPracticeActionsController.handleTransposeInputChange(value),
    handleStringShiftInputChange: (value) => melodyPracticeActionsController.handleStringShiftInputChange(value),
    applyCurrentTransposeToAllCustomMelodies: () =>
      melodyPracticeActionsController.applyCurrentTransposeToAllCustomMelodies(),
    handleStudyRangeChange: (range, options) =>
      melodyPracticeActionsController.handleStudyRangeChange(range, options),
  });
  const melodySelectionController = createMelodySelectionController(deps.melodySelection);

  return {
    melodySetupControlsController,
    melodyPracticeActionsController,
    melodyPracticeControlsController,
    melodySelectionController,
  };
}
