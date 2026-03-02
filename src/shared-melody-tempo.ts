import { clampMelodyPlaybackBpm } from './melody-timeline-duration';
import { clampMetronomeBpm } from './metronome';
import { isMelodyWorkflowMode } from './training-mode-groups';

export function shouldLinkMelodyTempoControls(trainingMode: string, metronomeEnabled: boolean) {
  return metronomeEnabled && isMelodyWorkflowMode(trainingMode);
}

export function resolveSharedMelodyTempoBpm(sourceBpm: number) {
  const melodyBpm = clampMelodyPlaybackBpm(sourceBpm);
  const metronomeBpm = clampMetronomeBpm(melodyBpm);
  return {
    melodyBpm,
    metronomeBpm,
  };
}
