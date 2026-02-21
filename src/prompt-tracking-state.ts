export interface StabilityTrackingState {
  stableNoteCounter: number;
  lastNote: string | null;
  lastDetectedChord: string;
  stableChordCounter: number;
}

export interface PromptCycleTrackingState extends StabilityTrackingState {
  consecutiveSilence: number;
  lastPitches: number[];
}

export function createStabilityTrackingResetState(): StabilityTrackingState {
  return {
    stableNoteCounter: 0,
    lastNote: null,
    lastDetectedChord: '',
    stableChordCounter: 0,
  };
}

export function createPromptCycleTrackingResetState(): PromptCycleTrackingState {
  return {
    ...createStabilityTrackingResetState(),
    consecutiveSilence: 0,
    lastPitches: [],
  };
}
