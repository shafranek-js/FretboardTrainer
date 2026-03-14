import { createSessionCurriculumPresetCluster } from '../session-curriculum-preset';
import { createSessionInputControlsCluster } from '../session-input-controls';
import { createSessionMetronomeCluster } from '../session-metronome';
import { createSessionWorkspaceGraphCluster } from '../session-workspace';

interface SessionConfigurationGraphClusterDeps {
  metronome: Parameters<typeof createSessionMetronomeCluster>[0];
  curriculumPreset: Parameters<typeof createSessionCurriculumPresetCluster>[0];
  inputControls: Omit<Parameters<typeof createSessionInputControlsCluster>[0], 'micSettings' | 'audioInputControls'> & {
    micSettings: Omit<Parameters<typeof createSessionInputControlsCluster>[0]['micSettings'], 'syncPracticePresetUi'>;
    audioInputControls: Omit<
      Parameters<typeof createSessionInputControlsCluster>[0]['audioInputControls'],
      'applySuggestedMicLatency' | 'startMicLatencyCalibration'
    >;
  };
  workspaceGraph: Omit<
    Parameters<typeof createSessionWorkspaceGraphCluster>[0],
    'curriculumPresetBridgeController' | 'metronomeBridgeController' | 'micSettingsController'
  >;
}

export function createSessionConfigurationGraphCluster(
  deps: SessionConfigurationGraphClusterDeps
) {
  const metronomeCluster = createSessionMetronomeCluster(deps.metronome);
  const curriculumPresetCluster = createSessionCurriculumPresetCluster(deps.curriculumPreset);

  let practicePresetUiControllerRef: ReturnType<
    typeof createSessionWorkspaceGraphCluster
  >['practicePresetUiController'] | null = null;
  let practicePresetControlsControllerRef: ReturnType<
    typeof createSessionWorkspaceGraphCluster
  >['practicePresetControlsController'] | null = null;

  const inputControlsCluster = createSessionInputControlsCluster({
    ...deps.inputControls,
    micSettings: {
      ...deps.inputControls.micSettings,
      syncPracticePresetUi: () => practicePresetUiControllerRef?.syncPracticePresetUi(),
    },
    audioInputControls: {
      ...deps.inputControls.audioInputControls,
      applySuggestedMicLatency: () =>
        practicePresetControlsControllerRef?.applySuggestedMicLatency(),
      startMicLatencyCalibration: () =>
        practicePresetControlsControllerRef?.startMicLatencyCalibration(),
    },
  });

  const workspaceGraphCluster = createSessionWorkspaceGraphCluster({
    ...deps.workspaceGraph,
    curriculumPresetBridgeController: curriculumPresetCluster.curriculumPresetBridgeController,
    metronomeBridgeController: metronomeCluster.metronomeBridgeController,
    micSettingsController: inputControlsCluster.micSettingsController,
  });

  practicePresetUiControllerRef = workspaceGraphCluster.practicePresetUiController;
  practicePresetControlsControllerRef = workspaceGraphCluster.practicePresetControlsController;

  return {
    ...metronomeCluster,
    ...curriculumPresetCluster,
    ...inputControlsCluster,
    ...workspaceGraphCluster,
  };
}





