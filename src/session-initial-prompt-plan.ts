import { clampMetronomeBeatsPerBar } from './metronome';
import { clampMelodyPlaybackBpm } from './melody-timeline-duration';

export const PERFORMANCE_SESSION_PREROLL_BARS = 1;

export interface SessionInitialPromptPlan {
  delayMs: number;
  prepMessage: string;
  pulseCount: number;
  secondaryAccentStepIndices: number[];
}

export interface SessionInitialPromptPlanInput {
  trainingMode: string;
  bpm?: number;
  beatsPerBar?: number;
  beatUnitDenominator?: number;
  secondaryAccentStepIndices?: number[];
}

export function buildSessionInitialPromptPlan({
  trainingMode,
  bpm = 90,
  beatsPerBar = 4,
  beatUnitDenominator = 4,
  secondaryAccentStepIndices = [],
}: SessionInitialPromptPlanInput): SessionInitialPromptPlan {
  if (trainingMode === 'performance' || trainingMode === 'practice') {
    const clampedBeatsPerBar = clampMetronomeBeatsPerBar(beatsPerBar);
    const normalizedBeatUnitDenominator =
      Number.isFinite(beatUnitDenominator) && beatUnitDenominator > 0 ? Math.round(beatUnitDenominator) : 4;
    const beatMs = 60000 / clampMelodyPlaybackBpm(bpm);
    const pulseMs = beatMs * (4 / normalizedBeatUnitDenominator);
    return {
      delayMs: Math.max(0, Math.round(pulseMs * clampedBeatsPerBar * PERFORMANCE_SESSION_PREROLL_BARS)),
      prepMessage: 'Get ready...',
      pulseCount: clampedBeatsPerBar * PERFORMANCE_SESSION_PREROLL_BARS,
      secondaryAccentStepIndices: [...secondaryAccentStepIndices],
    };
  }

  return {
    delayMs: 0,
    prepMessage: '',
    pulseCount: 0,
    secondaryAccentStepIndices: [],
  };
}
