import type { Prompt } from './types';
import { createPromptCycleTrackingResetState } from './prompt-tracking-state';

export interface SessionStopResetState {
  currentPrompt: Prompt | null;
  liveDetectedNote: string | null;
  liveDetectedString: string | null;
  wrongDetectedNote: string | null;
  wrongDetectedString: string | null;
  wrongDetectedFret: number | null;
  rhythmLastJudgedBeatAtMs: number | null;
  scaleNotes: { note: string; string: string }[];
  currentScaleIndex: number;
  currentProgression: string[];
  currentProgressionIndex: number;
  currentArpeggioIndex: number;
  currentMelodyId: string | null;
  currentMelodyEventIndex: number;
  currentMelodyEventFoundNotes: Set<string>;
  melodyDemoRuntimeActive: boolean;
  melodyDemoRuntimePaused: boolean;
  melodyDemoRuntimeBaseTimeSec: number;
  melodyDemoRuntimeAnchorStartedAtMs: number | null;
  melodyDemoRuntimePausedOffsetSec: number;
  performancePromptResolved: boolean;
  performancePromptMatched: boolean;
  performancePromptHadAttempt: boolean;
  performancePrerollLeadInVisible: boolean;
  performancePrerollStartedAtMs: number | null;
  performancePrerollDurationMs: number;
  performancePrerollStepIndex: number | null;
  performanceRuntimeStartedAtMs: number | null;
  showSessionSummaryOnStop: boolean;
  pendingSessionStopResultMessage: { text: string; tone: 'neutral' | 'success' | 'error' } | null;
}

export function createSessionStopResetState() {
  return {
    ...createPromptCycleTrackingResetState(),
    currentPrompt: null,
    liveDetectedNote: null,
    liveDetectedString: null,
    wrongDetectedNote: null,
    wrongDetectedString: null,
    wrongDetectedFret: null,
    rhythmLastJudgedBeatAtMs: null,
    scaleNotes: [],
    currentScaleIndex: 0,
    currentProgression: [],
    currentProgressionIndex: 0,
    currentArpeggioIndex: 0,
    currentMelodyId: null,
    currentMelodyEventIndex: 0,
    currentMelodyEventFoundNotes: new Set<string>(),
    melodyDemoRuntimeActive: false,
    melodyDemoRuntimePaused: false,
    melodyDemoRuntimeBaseTimeSec: 0,
    melodyDemoRuntimeAnchorStartedAtMs: null,
    melodyDemoRuntimePausedOffsetSec: 0,
    performancePromptResolved: false,
    performancePromptMatched: false,
    performancePromptHadAttempt: false,
    performancePrerollLeadInVisible: false,
    performancePrerollStartedAtMs: null,
    performancePrerollDurationMs: 0,
    performancePrerollStepIndex: null,
    performanceRuntimeStartedAtMs: null,
    showSessionSummaryOnStop: false,
    pendingSessionStopResultMessage: null,
  } satisfies SessionStopResetState & ReturnType<typeof createPromptCycleTrackingResetState>;
}
