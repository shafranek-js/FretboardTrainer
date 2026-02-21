import type { Prompt } from './types';
import { createPromptCycleTrackingResetState } from './prompt-tracking-state';

export interface SessionStopResetState {
  currentPrompt: Prompt | null;
  scaleNotes: { note: string; string: string }[];
  currentScaleIndex: number;
  currentProgression: string[];
  currentProgressionIndex: number;
  currentArpeggioIndex: number;
}

export function createSessionStopResetState() {
  return {
    ...createPromptCycleTrackingResetState(),
    currentPrompt: null,
    scaleNotes: [],
    currentScaleIndex: 0,
    currentProgression: [],
    currentProgressionIndex: 0,
    currentArpeggioIndex: 0,
  } satisfies SessionStopResetState & ReturnType<typeof createPromptCycleTrackingResetState>;
}
