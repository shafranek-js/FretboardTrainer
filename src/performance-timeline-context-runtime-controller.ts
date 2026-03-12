type AppDom = typeof import('./dom').dom;
type AppState = typeof import('./state').state;

interface PerformanceTimelineContextRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode'>;
  state: Pick<
    AppState,
    | 'performanceActiveEventIndex'
    | 'currentMelodyId'
    | 'currentInstrument'
    | 'melodyTransposeSemitones'
    | 'melodyStringShift'
  >;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  buildPerformanceTimelineFeedbackKey: typeof import('./performance-timeline-feedback').buildPerformanceTimelineFeedbackKey;
}

export function createPerformanceTimelineContextRuntimeController(
  deps: PerformanceTimelineContextRuntimeControllerDeps
) {
  function getCurrentEventIndex() {
    if (!deps.isPerformanceStyleMode(deps.dom.trainingMode.value)) return null;
    const eventIndex = deps.state.performanceActiveEventIndex;
    return Number.isInteger(eventIndex) && eventIndex >= 0 ? eventIndex : null;
  }

  function getFeedbackKey() {
    return deps.buildPerformanceTimelineFeedbackKey({
      melodyId: deps.state.currentMelodyId,
      instrumentName: deps.state.currentInstrument.name,
      melodyTransposeSemitones: deps.state.melodyTransposeSemitones,
      melodyStringShift: deps.state.melodyStringShift,
    });
  }

  return {
    getCurrentEventIndex,
    getFeedbackKey,
  };
}
