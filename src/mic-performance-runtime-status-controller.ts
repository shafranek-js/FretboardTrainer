import { normalizeMicPolyphonicDetectorProvider } from './mic-polyphonic-detector';
import type { AppState } from './state';

interface PerformanceRuntimeStatusControllerDeps {
  state: Pick<
    AppState,
    | 'inputSource'
    | 'micPerformanceReadinessLastUiRefreshAtMs'
    | 'micPerformanceJudgmentCount'
    | 'micPerformanceJudgmentTotalLatencyMs'
    | 'micPerformanceJudgmentLastLatencyMs'
    | 'micPerformanceJudgmentMaxLatencyMs'
    | 'micPerformanceLatencyCalibrationActive'
    | 'micPolyphonicDetectorTelemetryFrames'
    | 'micPolyphonicDetectorTelemetryTotalLatencyMs'
    | 'micPolyphonicDetectorTelemetryMaxLatencyMs'
    | 'micPolyphonicDetectorTelemetryLastLatencyMs'
    | 'micPolyphonicDetectorTelemetryFallbackFrames'
    | 'micPolyphonicDetectorTelemetryWarningFrames'
    | 'micPolyphonicDetectorTelemetryWindowStartedAtMs'
    | 'micPolyphonicDetectorTelemetryLastUiRefreshAtMs'
    | 'lastMicPolyphonicDetectorProviderUsed'
    | 'lastMicPolyphonicDetectorFallbackFrom'
    | 'lastMicPolyphonicDetectorWarning'
  >;
  refreshMicPerformanceReadinessUi: (nowMs?: number) => void;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  now?: () => number;
}

interface MicPolyphonicRuntimeResult {
  provider?: string | null;
  fallbackFrom?: string | null;
  warnings?: string[] | null;
}

export function createMicPerformanceRuntimeStatusController(
  deps: PerformanceRuntimeStatusControllerDeps
) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function refreshReadinessUiThrottled(nowMs = now()) {
    if (nowMs - deps.state.micPerformanceReadinessLastUiRefreshAtMs < 250) return;
    deps.state.micPerformanceReadinessLastUiRefreshAtMs = nowMs;
    deps.refreshMicPerformanceReadinessUi(nowMs);
  }

  function updatePolyphonicDetectorRuntimeStatus(result: MicPolyphonicRuntimeResult, latencyMs: number) {
    const nowMs = now();
    if (deps.state.micPolyphonicDetectorTelemetryWindowStartedAtMs <= 0) {
      deps.state.micPolyphonicDetectorTelemetryWindowStartedAtMs = nowMs;
    }
    deps.state.micPolyphonicDetectorTelemetryFrames += 1;
    deps.state.micPolyphonicDetectorTelemetryTotalLatencyMs += Math.max(0, latencyMs);
    deps.state.micPolyphonicDetectorTelemetryMaxLatencyMs = Math.max(
      deps.state.micPolyphonicDetectorTelemetryMaxLatencyMs,
      Math.max(0, latencyMs)
    );
    deps.state.micPolyphonicDetectorTelemetryLastLatencyMs = Math.max(0, latencyMs);
    if (result.fallbackFrom) deps.state.micPolyphonicDetectorTelemetryFallbackFrames += 1;
    if ((result.warnings?.length ?? 0) > 0) deps.state.micPolyphonicDetectorTelemetryWarningFrames += 1;

    const nextProvider =
      typeof result.provider === 'string' ? normalizeMicPolyphonicDetectorProvider(result.provider) : null;
    const nextFallbackFrom =
      typeof result.fallbackFrom === 'string'
        ? normalizeMicPolyphonicDetectorProvider(result.fallbackFrom)
        : null;
    const nextWarning = result.warnings?.[0] ?? null;
    const changed =
      deps.state.lastMicPolyphonicDetectorProviderUsed !== nextProvider ||
      deps.state.lastMicPolyphonicDetectorFallbackFrom !== nextFallbackFrom ||
      deps.state.lastMicPolyphonicDetectorWarning !== nextWarning;

    deps.state.lastMicPolyphonicDetectorProviderUsed = nextProvider;
    deps.state.lastMicPolyphonicDetectorFallbackFrom = nextFallbackFrom;
    deps.state.lastMicPolyphonicDetectorWarning = nextWarning;

    const shouldRefreshTelemetryUi =
      deps.state.inputSource === 'microphone' &&
      (changed || nowMs - deps.state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs >= 1000);

    if (shouldRefreshTelemetryUi) {
      deps.state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = nowMs;
      deps.refreshMicPolyphonicDetectorAudioInfoUi();
      deps.refreshMicPerformanceReadinessUi(nowMs);
    }
  }

  function recordJudgmentLatency(onsetAtMs: number, judgedAtMs: number) {
    const latencyMs = Math.max(0, judgedAtMs - onsetAtMs);
    deps.state.micPerformanceJudgmentCount += 1;
    deps.state.micPerformanceJudgmentTotalLatencyMs += latencyMs;
    deps.state.micPerformanceJudgmentLastLatencyMs = latencyMs;
    deps.state.micPerformanceJudgmentMaxLatencyMs = Math.max(
      deps.state.micPerformanceJudgmentMaxLatencyMs,
      latencyMs
    );
    if (deps.state.micPerformanceLatencyCalibrationActive && deps.state.micPerformanceJudgmentCount >= 5) {
      deps.state.micPerformanceLatencyCalibrationActive = false;
    }
    refreshReadinessUiThrottled(judgedAtMs);
  }

  function resetPolyphonicDetectorTelemetry() {
    deps.state.lastMicPolyphonicDetectorProviderUsed = null;
    deps.state.lastMicPolyphonicDetectorFallbackFrom = null;
    deps.state.lastMicPolyphonicDetectorWarning = null;
    deps.state.micPolyphonicDetectorTelemetryFrames = 0;
    deps.state.micPolyphonicDetectorTelemetryTotalLatencyMs = 0;
    deps.state.micPolyphonicDetectorTelemetryMaxLatencyMs = 0;
    deps.state.micPolyphonicDetectorTelemetryLastLatencyMs = null;
    deps.state.micPolyphonicDetectorTelemetryFallbackFrames = 0;
    deps.state.micPolyphonicDetectorTelemetryWarningFrames = 0;
    deps.state.micPolyphonicDetectorTelemetryWindowStartedAtMs = 0;
    deps.state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = 0;
  }

  function resetReadinessAndJudgmentTelemetry() {
    deps.state.micPerformanceReadinessLastUiRefreshAtMs = 0;
    deps.state.micPerformanceJudgmentCount = 0;
    deps.state.micPerformanceJudgmentTotalLatencyMs = 0;
    deps.state.micPerformanceJudgmentLastLatencyMs = null;
    deps.state.micPerformanceJudgmentMaxLatencyMs = 0;
  }

  return {
    refreshReadinessUiThrottled,
    updatePolyphonicDetectorRuntimeStatus,
    recordJudgmentLatency,
    resetPolyphonicDetectorTelemetry,
    resetReadinessAndJudgmentTelemetry,
  };
}
