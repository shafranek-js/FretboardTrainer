import { createDetectedNoteFeedbackRuntimeController } from './detected-note-feedback-runtime-controller';
import { createMicPerformanceRuntimeStatusController } from './mic-performance-runtime-status-controller';
import { createPerformanceAdaptiveRuntimeController } from './performance-adaptive-runtime-controller';
import { createPerformanceMicTelemetryController } from './performance-mic-telemetry-controller';
import { createPerformanceTimelineContextRuntimeController } from './performance-timeline-context-runtime-controller';
import { createPerformanceTimelineFeedbackController } from './performance-timeline-feedback-controller';

interface SessionPerformanceFeedbackClusterDeps {
  performanceTimelineContext: Parameters<typeof createPerformanceTimelineContextRuntimeController>[0];
  performanceTimelineFeedback: Omit<
    Parameters<typeof createPerformanceTimelineFeedbackController>[0],
    'getCurrentEventIndex' | 'getFeedbackKey'
  >;
  performanceMicTelemetry: Omit<
    Parameters<typeof createPerformanceMicTelemetryController>[0],
    'getCurrentEventIndex'
  >;
  micPerformanceRuntimeStatus: Parameters<typeof createMicPerformanceRuntimeStatusController>[0];
  detectedNoteFeedback: Parameters<typeof createDetectedNoteFeedbackRuntimeController>[0];
  performanceAdaptive: Parameters<typeof createPerformanceAdaptiveRuntimeController>[0];
}

export function createSessionPerformanceFeedbackCluster(
  deps: SessionPerformanceFeedbackClusterDeps
) {
  const performanceTimelineContextRuntimeController = createPerformanceTimelineContextRuntimeController(
    deps.performanceTimelineContext
  );
  const performanceTimelineFeedbackController = createPerformanceTimelineFeedbackController({
    ...deps.performanceTimelineFeedback,
    getCurrentEventIndex: () => performanceTimelineContextRuntimeController.getCurrentEventIndex(),
    getFeedbackKey: () => performanceTimelineContextRuntimeController.getFeedbackKey(),
  });
  const performanceMicTelemetryController = createPerformanceMicTelemetryController({
    ...deps.performanceMicTelemetry,
    getCurrentEventIndex: () => performanceTimelineContextRuntimeController.getCurrentEventIndex(),
  });
  const micPerformanceRuntimeStatusController = createMicPerformanceRuntimeStatusController(
    deps.micPerformanceRuntimeStatus
  );
  const detectedNoteFeedbackRuntimeController = createDetectedNoteFeedbackRuntimeController(
    deps.detectedNoteFeedback
  );
  const performanceAdaptiveRuntimeController = createPerformanceAdaptiveRuntimeController(
    deps.performanceAdaptive
  );

  return {
    performanceTimelineContextRuntimeController,
    performanceTimelineFeedbackController,
    performanceMicTelemetryController,
    micPerformanceRuntimeStatusController,
    detectedNoteFeedbackRuntimeController,
    performanceAdaptiveRuntimeController,
  };
}
