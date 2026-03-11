export interface MetronomeRuntimeBridgeControllerDeps {
  syncBpmDisplay: () => void;
  getClampedBpmFromInput: () => number;
  resetVisualIndicator: () => void;
}

export function createMetronomeRuntimeBridgeController(
  deps: MetronomeRuntimeBridgeControllerDeps
) {
  return {
    syncBpmDisplay: () => deps.syncBpmDisplay(),
    getClampedBpmFromInput: () => deps.getClampedBpmFromInput(),
    resetVisualIndicator: () => deps.resetVisualIndicator(),
  };
}
