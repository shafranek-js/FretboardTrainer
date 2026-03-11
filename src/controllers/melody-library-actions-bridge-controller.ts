import type { MelodyDefinition } from '../melody-library';

interface MelodyLibraryActionsBridgeControllerDeps {
  savePendingMidiImportedTrack: () => void;
  savePendingGpImportedTrack: () => void;
  saveFromModal: () => void;
  exportSelectedMelodyAsMidi: () => Promise<void>;
  bakeSelectedPracticeAdjustedMelodyAsCustom: () => void;
}

export function createMelodyLibraryActionsBridgeController(
  deps: MelodyLibraryActionsBridgeControllerDeps
) {
  return {
    savePendingMidiImportedTrack: () => deps.savePendingMidiImportedTrack(),
    savePendingGpImportedTrack: () => deps.savePendingGpImportedTrack(),
    saveFromModal: () => deps.saveFromModal(),
    exportSelectedMelodyAsMidi: () => deps.exportSelectedMelodyAsMidi(),
    bakeSelectedPracticeAdjustedMelodyAsCustom: () => deps.bakeSelectedPracticeAdjustedMelodyAsCustom(),
  };
}
