import type { IInstrument } from '../instruments/instrument';
import type { MelodyDefinition } from '../melody-library';
import { createMelodyPracticeSettingsBridgeController } from './melody-practice-settings-bridge-controller';
import { createMelodyPracticeSettingsController } from './melody-practice-settings-controller';
import { createSelectedMelodyContextController } from './selected-melody-context-controller';

interface SessionMelodySettingsClusterDeps {
  selectedMelodyContext: Parameters<typeof createSelectedMelodyContextController<MelodyDefinition, MelodyDefinition, IInstrument>>[0];
  melodyPracticeSettings: Parameters<typeof createMelodyPracticeSettingsController>[0];
  melodyPracticeSettingsBridge: Omit<
    Parameters<typeof createMelodyPracticeSettingsBridgeController>[0],
    'getStoredMelodyStudyRange'
    | 'syncMelodyLoopRangeDisplay'
    | 'hydrateMelodyTransposeForSelectedMelody'
    | 'hydrateMelodyStringShiftForSelectedMelody'
    | 'hydrateMelodyStudyRangeForSelectedMelody'
    | 'applyMelodyTransposeSemitones'
    | 'applyMelodyStringShift'
    | 'applyMelodyStudyRange'
    | 'setStoredMelodyTransposeSemitones'
    | 'refreshMelodyOptionsForCurrentInstrument'
  >;
}

export function createSessionMelodySettingsCluster(deps: SessionMelodySettingsClusterDeps) {
  const selectedMelodyContextController = createSelectedMelodyContextController(deps.selectedMelodyContext);
  const melodyPracticeSettingsController = createMelodyPracticeSettingsController(deps.melodyPracticeSettings);
  const melodyPracticeSettingsBridgeController = createMelodyPracticeSettingsBridgeController({
    ...deps.melodyPracticeSettingsBridge,
    getStoredMelodyStudyRange: (melodyId, totalEvents) =>
      melodyPracticeSettingsController.getStoredMelodyStudyRange(melodyId, totalEvents),
    syncMelodyLoopRangeDisplay: () => melodyPracticeSettingsController.syncMelodyLoopRangeDisplay(),
    hydrateMelodyTransposeForSelectedMelody: (options) =>
      melodyPracticeSettingsController.hydrateMelodyTransposeForSelectedMelody(options),
    hydrateMelodyStringShiftForSelectedMelody: () =>
      melodyPracticeSettingsController.hydrateMelodyStringShiftForSelectedMelody(),
    hydrateMelodyStudyRangeForSelectedMelody: () =>
      melodyPracticeSettingsController.hydrateMelodyStudyRangeForSelectedMelody(),
    applyMelodyTransposeSemitones: (nextValue) =>
      melodyPracticeSettingsController.applyMelodyTransposeSemitones(nextValue),
    applyMelodyStringShift: (nextValue) => melodyPracticeSettingsController.applyMelodyStringShift(nextValue),
    applyMelodyStudyRange: (range) => melodyPracticeSettingsController.applyMelodyStudyRange(range),
    setStoredMelodyTransposeSemitones: (melodyId, semitones) =>
      melodyPracticeSettingsController.setStoredMelodyTransposeSemitones(melodyId, semitones),
    refreshMelodyOptionsForCurrentInstrument: () =>
      melodyPracticeSettingsController.refreshMelodyOptionsForCurrentInstrument(),
  });

  return {
    selectedMelodyContextController,
    melodyPracticeSettingsController,
    melodyPracticeSettingsBridgeController,
  };
}



