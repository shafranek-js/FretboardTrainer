import { createMicMonophonicAttackTrackingController } from './mic-monophonic-attack-tracking-controller';
import { createPerformancePromptController } from './performance-prompt-controller';
import { createPerformanceTransportRuntimeController } from './performance-transport-runtime-controller';
import { createRhythmModeRuntimeController } from './rhythm-mode-runtime-controller';
import { createSessionPromptRuntimeController } from './session-prompt-runtime-controller';

interface SessionPromptPerformanceRuntimeClusterDeps {
  rhythmMode: Parameters<typeof createRhythmModeRuntimeController>[0];
  micMonophonicAttackTracking: Parameters<typeof createMicMonophonicAttackTrackingController>[0];
  sessionPrompt: Parameters<typeof createSessionPromptRuntimeController>[0];
  performancePrompt: Omit<Parameters<typeof createPerformancePromptController>[0], 'nextPrompt'>;
  performanceTransport: Omit<
    Parameters<typeof createPerformanceTransportRuntimeController>[0],
    'onAdvancePrompt'
  >;
  nextPrompt: () => void;
}

export function createSessionPromptPerformanceRuntimeCluster(
  deps: SessionPromptPerformanceRuntimeClusterDeps
) {
  const rhythmModeRuntimeController = createRhythmModeRuntimeController(deps.rhythmMode);
  const micMonophonicAttackTrackingController = createMicMonophonicAttackTrackingController(
    deps.micMonophonicAttackTracking
  );
  const sessionPromptRuntimeController = createSessionPromptRuntimeController(deps.sessionPrompt);
  const performancePromptController = createPerformancePromptController({
    ...deps.performancePrompt,
    nextPrompt: deps.nextPrompt,
  });
  const performanceTransportRuntimeController = createPerformanceTransportRuntimeController({
    ...deps.performanceTransport,
    onAdvancePrompt: deps.nextPrompt,
  });

  return {
    rhythmModeRuntimeController,
    micMonophonicAttackTrackingController,
    sessionPromptRuntimeController,
    performancePromptController,
    performanceTransportRuntimeController,
  };
}
