import type { Prompt } from './types';
import { createPromptCycleTrackingResetState } from './prompt-tracking-state';

export interface SessionStopResetState {
  currentPrompt: Prompt | null;
  liveDetectedNote: string | null;
  liveDetectedString: string | null;
  rhythmLastJudgedBeatAtMs: number | null;
  scaleNotes: { note: string; string: string }[];
  currentScaleIndex: number;
  currentProgression: string[];
  currentProgressionIndex: number;
  currentArpeggioIndex: number;
  currentMelodyId: string | null;
  currentMelodyEventIndex: number;
  currentMelodyEventFoundNotes: Set<string>;
  pendingSessionStopResultMessage: { text: string; tone: 'neutral' | 'success' | 'error' } | null;
}

export function createSessionStopResetState() {
  return {
    ...createPromptCycleTrackingResetState(),
    currentPrompt: null,
    liveDetectedNote: null,
    liveDetectedString: null,
    rhythmLastJudgedBeatAtMs: null,
    scaleNotes: [],
    currentScaleIndex: 0,
    currentProgression: [],
    currentProgressionIndex: 0,
    currentArpeggioIndex: 0,
    currentMelodyId: null,
    currentMelodyEventIndex: 0,
    currentMelodyEventFoundNotes: new Set<string>(),
    pendingSessionStopResultMessage: null,
  } satisfies SessionStopResetState & ReturnType<typeof createPromptCycleTrackingResetState>;
}
