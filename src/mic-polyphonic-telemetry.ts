import { normalizeMicPolyphonicDetectorProvider } from './mic-polyphonic-detector';

export interface MicPolyphonicTelemetrySnapshotInput {
  configuredProvider: string;
  runtimeProvider: string | null;
  fallbackFrom: string | null;
  lastWarning: string | null;
  frames: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
  lastLatencyMs: number | null;
  fallbackFrames: number;
  warningFrames: number;
  windowStartedAtMs: number;
  capturedAtMs: number;
  userAgent?: string;
  hardwareConcurrency?: number | null;
}

export interface MicPolyphonicTelemetrySnapshot {
  type: 'mic-polyphonic-telemetry';
  version: 1;
  capturedAtIso: string;
  telemetryWindowStartedAtIso: string | null;
  telemetryWindowDurationSec: number;
  configuredProvider: string;
  runtimeProvider: string | null;
  fallbackFrom: string | null;
  lastWarning: string | null;
  frames: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  lastLatencyMs: number | null;
  fallbackFrames: number;
  warningFrames: number;
  environment: {
    userAgent?: string;
    hardwareConcurrency?: number | null;
  };
}

function toIsoOrNull(timestampMs: number) {
  return timestampMs > 0 ? new Date(timestampMs).toISOString() : null;
}

export function buildMicPolyphonicTelemetrySnapshot(
  input: MicPolyphonicTelemetrySnapshotInput
): MicPolyphonicTelemetrySnapshot {
  const frames = Math.max(0, input.frames);
  const avgLatencyMs = frames > 0 ? input.totalLatencyMs / frames : 0;
  const telemetryWindowDurationSec =
    input.windowStartedAtMs > 0
      ? Math.max(0, (input.capturedAtMs - input.windowStartedAtMs) / 1000)
      : 0;

  return {
    type: 'mic-polyphonic-telemetry',
    version: 1,
    capturedAtIso: new Date(input.capturedAtMs).toISOString(),
    telemetryWindowStartedAtIso: toIsoOrNull(input.windowStartedAtMs),
    telemetryWindowDurationSec,
    configuredProvider: normalizeMicPolyphonicDetectorProvider(input.configuredProvider),
    runtimeProvider: input.runtimeProvider,
    fallbackFrom: input.fallbackFrom,
    lastWarning: input.lastWarning,
    frames,
    avgLatencyMs,
    maxLatencyMs: Math.max(0, input.maxLatencyMs),
    lastLatencyMs: input.lastLatencyMs === null ? null : Math.max(0, input.lastLatencyMs),
    fallbackFrames: Math.max(0, input.fallbackFrames),
    warningFrames: Math.max(0, input.warningFrames),
    environment: {
      userAgent: input.userAgent,
      hardwareConcurrency: input.hardwareConcurrency ?? null,
    },
  };
}

export function formatMicPolyphonicTelemetryFileName(capturedAtMs: number) {
  const iso = new Date(capturedAtMs).toISOString().replace(/[:.]/g, '-');
  return `mic-poly-telemetry-${iso}.json`;
}

