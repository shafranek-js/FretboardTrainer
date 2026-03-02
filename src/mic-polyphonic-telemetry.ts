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
  sensitivityPreset?: string;
  resolvedVolumeThreshold?: number | null;
  autoNoiseFloorRms?: number | null;
  attackFilterPreset?: string;
  attackPeakMultiplier?: number | null;
  holdFilterPreset?: string;
  holdDurationMs?: number | null;
  requiredStableFrames?: number | null;
  analyserSampleRate?: number | null;
  analyserFftSize?: number | null;
}

export interface MicPolyphonicTelemetrySnapshot {
  type: 'mic-polyphonic-telemetry';
  version: 2;
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
  framesPerSecond: number;
  fallbackRate: number;
  warningRate: number;
  environment: {
    userAgent?: string;
    hardwareConcurrency?: number | null;
  };
  configuration: {
    sensitivityPreset?: string;
    resolvedVolumeThreshold: number | null;
    autoNoiseFloorRms: number | null;
    attackFilterPreset?: string;
    attackPeakMultiplier: number | null;
    holdFilterPreset?: string;
    holdDurationMs: number | null;
    requiredStableFrames: number | null;
    analyserSampleRate: number | null;
    analyserFftSize: number | null;
  };
}

function toIsoOrNull(timestampMs: number) {
  return timestampMs > 0 ? new Date(timestampMs).toISOString() : null;
}

function normalizeFiniteNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
  const fallbackFrames = Math.max(0, input.fallbackFrames);
  const warningFrames = Math.max(0, input.warningFrames);
  const framesPerSecond = telemetryWindowDurationSec > 0 ? frames / telemetryWindowDurationSec : 0;
  const fallbackRate = frames > 0 ? fallbackFrames / frames : 0;
  const warningRate = frames > 0 ? warningFrames / frames : 0;

  return {
    type: 'mic-polyphonic-telemetry',
    version: 2,
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
    fallbackFrames,
    warningFrames,
    framesPerSecond,
    fallbackRate,
    warningRate,
    environment: {
      userAgent: input.userAgent,
      hardwareConcurrency: input.hardwareConcurrency ?? null,
    },
    configuration: {
      sensitivityPreset: input.sensitivityPreset,
      resolvedVolumeThreshold: normalizeFiniteNumber(input.resolvedVolumeThreshold),
      autoNoiseFloorRms: normalizeFiniteNumber(input.autoNoiseFloorRms),
      attackFilterPreset: input.attackFilterPreset,
      attackPeakMultiplier: normalizeFiniteNumber(input.attackPeakMultiplier),
      holdFilterPreset: input.holdFilterPreset,
      holdDurationMs: normalizeFiniteNumber(input.holdDurationMs),
      requiredStableFrames: normalizeFiniteNumber(input.requiredStableFrames),
      analyserSampleRate: normalizeFiniteNumber(input.analyserSampleRate),
      analyserFftSize: normalizeFiniteNumber(input.analyserFftSize),
    },
  };
}

export function formatMicPolyphonicTelemetryFileName(capturedAtMs: number) {
  const iso = new Date(capturedAtMs).toISOString().replace(/[:.]/g, '-');
  return `mic-poly-telemetry-${iso}.json`;
}

