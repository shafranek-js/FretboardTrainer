import {
  buildMicPolyphonicTelemetrySnapshot,
  formatMicPolyphonicTelemetryFileName,
} from '../mic-polyphonic-telemetry';

interface MicPolyphonicTelemetryControllerDom {
  exportMicPolyphonicTelemetryBtn: HTMLButtonElement;
  resetMicPolyphonicTelemetryBtn: HTMLButtonElement;
}

interface MicPolyphonicTelemetryControllerState {
  micPolyphonicDetectorProvider: string;
  lastMicPolyphonicDetectorProviderUsed: string | null;
  lastMicPolyphonicDetectorFallbackFrom: string | null;
  lastMicPolyphonicDetectorWarning: string | null;
  micPolyphonicDetectorTelemetryFrames: number;
  micPolyphonicDetectorTelemetryTotalLatencyMs: number;
  micPolyphonicDetectorTelemetryMaxLatencyMs: number;
  micPolyphonicDetectorTelemetryLastLatencyMs: number | null;
  micPolyphonicDetectorTelemetryFallbackFrames: number;
  micPolyphonicDetectorTelemetryWarningFrames: number;
  micPolyphonicDetectorTelemetryWindowStartedAtMs: number;
}

interface MicPolyphonicTelemetryControllerDeps {
  dom: MicPolyphonicTelemetryControllerDom;
  state: MicPolyphonicTelemetryControllerState;
  now(): number;
  getUserAgent(): string | undefined;
  getHardwareConcurrency(): number | null;
  downloadTextFile(fileName: string, text: string, mimeType: string): void;
  resetTelemetry(): void;
  refreshTelemetryUi(): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
  showNonBlockingError(message: string): void;
  formatUserFacingError(prefix: string, error: unknown): string;
}

export function createMicPolyphonicTelemetryController(
  deps: MicPolyphonicTelemetryControllerDeps
) {
  function exportTelemetry() {
    if (deps.state.micPolyphonicDetectorTelemetryFrames <= 0) {
      deps.setResultMessage('No poly detector telemetry has been collected yet.', 'error');
      return;
    }

    try {
      const capturedAtMs = deps.now();
      const snapshot = buildMicPolyphonicTelemetrySnapshot({
        configuredProvider: deps.state.micPolyphonicDetectorProvider,
        runtimeProvider: deps.state.lastMicPolyphonicDetectorProviderUsed,
        fallbackFrom: deps.state.lastMicPolyphonicDetectorFallbackFrom,
        lastWarning: deps.state.lastMicPolyphonicDetectorWarning,
        frames: deps.state.micPolyphonicDetectorTelemetryFrames,
        totalLatencyMs: deps.state.micPolyphonicDetectorTelemetryTotalLatencyMs,
        maxLatencyMs: deps.state.micPolyphonicDetectorTelemetryMaxLatencyMs,
        lastLatencyMs: deps.state.micPolyphonicDetectorTelemetryLastLatencyMs,
        fallbackFrames: deps.state.micPolyphonicDetectorTelemetryFallbackFrames,
        warningFrames: deps.state.micPolyphonicDetectorTelemetryWarningFrames,
        windowStartedAtMs: deps.state.micPolyphonicDetectorTelemetryWindowStartedAtMs,
        capturedAtMs,
        userAgent: deps.getUserAgent(),
        hardwareConcurrency: deps.getHardwareConcurrency(),
      });

      deps.downloadTextFile(
        formatMicPolyphonicTelemetryFileName(capturedAtMs),
        `${JSON.stringify(snapshot, null, 2)}\n`,
        'application/json'
      );
      deps.setResultMessage('Poly detector telemetry exported.', 'success');
    } catch (error) {
      deps.showNonBlockingError(
        deps.formatUserFacingError('Failed to export poly detector telemetry', error)
      );
    }
  }

  function resetTelemetry() {
    deps.resetTelemetry();
    deps.refreshTelemetryUi();
    syncButtonState();
    deps.setResultMessage('Poly detector telemetry reset.', 'success');
  }

  function syncButtonState() {
    const hasTelemetry = deps.state.micPolyphonicDetectorTelemetryFrames > 0;
    deps.dom.exportMicPolyphonicTelemetryBtn.disabled = !hasTelemetry;
    deps.dom.resetMicPolyphonicTelemetryBtn.disabled = !hasTelemetry;
  }

  return {
    exportTelemetry,
    resetTelemetry,
    syncButtonState,
  };
}
