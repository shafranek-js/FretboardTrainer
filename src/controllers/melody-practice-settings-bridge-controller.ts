import type { MelodyStudyRange } from '../melody-study-range';

export interface MelodyPracticeSettingsBridgeControllerDeps {
  getStoredMelodyStudyRange: (melodyId: string | null, totalEvents: number) => MelodyStudyRange;
  syncMelodyLoopRangeDisplay: () => void;
  hydrateMelodyTransposeForSelectedMelody: (options?: { migrateLegacyValue?: boolean }) => void;
  hydrateMelodyStringShiftForSelectedMelody: () => void;
  hydrateMelodyStudyRangeForSelectedMelody: () => void;
  applyMelodyTransposeSemitones: (nextValue: unknown) => boolean;
  applyMelodyStringShift: (nextValue: unknown) => { changed: boolean; valid: boolean };
  applyMelodyStudyRange: (range: Partial<MelodyStudyRange>) => boolean;
  setStoredMelodyTransposeSemitones: (melodyId: string | null, semitones: number) => number;
  refreshMelodyOptionsForCurrentInstrument: () => void;
}

export function createMelodyPracticeSettingsBridgeController(
  deps: MelodyPracticeSettingsBridgeControllerDeps
) {
  return {
    getStoredMelodyStudyRange: (melodyId: string | null, totalEvents: number) =>
      deps.getStoredMelodyStudyRange(melodyId, totalEvents),
    syncMelodyLoopRangeDisplay: () => deps.syncMelodyLoopRangeDisplay(),
    hydrateMelodyTransposeForSelectedMelody: (options?: { migrateLegacyValue?: boolean }) =>
      deps.hydrateMelodyTransposeForSelectedMelody(options),
    hydrateMelodyStringShiftForSelectedMelody: () => deps.hydrateMelodyStringShiftForSelectedMelody(),
    hydrateMelodyStudyRangeForSelectedMelody: () => deps.hydrateMelodyStudyRangeForSelectedMelody(),
    applyMelodyTransposeSemitones: (nextValue: unknown) => deps.applyMelodyTransposeSemitones(nextValue),
    applyMelodyStringShift: (nextValue: unknown) => deps.applyMelodyStringShift(nextValue),
    applyMelodyStudyRange: (range: Partial<MelodyStudyRange>) => deps.applyMelodyStudyRange(range),
    setStoredMelodyTransposeSemitones: (melodyId: string | null, semitones: number) =>
      deps.setStoredMelodyTransposeSemitones(melodyId, semitones),
    refreshMelodyOptionsForCurrentInstrument: () => deps.refreshMelodyOptionsForCurrentInstrument(),
  };
}
