import { describe, expect, it } from 'vitest';
import {
  buildMicPolyphonicTelemetrySnapshot,
  formatMicPolyphonicTelemetryFileName,
} from './mic-polyphonic-telemetry';

describe('mic-polyphonic-telemetry', () => {
  it('builds a normalized telemetry snapshot with derived timing fields', () => {
    const snapshot = buildMicPolyphonicTelemetrySnapshot({
      configuredProvider: 'essentia_experimental',
      runtimeProvider: 'spectrum',
      fallbackFrom: 'essentia_experimental',
      lastWarning: 'Fallback to spectrum',
      frames: 10,
      totalLatencyMs: 25,
      maxLatencyMs: 4.5,
      lastLatencyMs: 3.2,
      fallbackFrames: 2,
      warningFrames: 3,
      windowStartedAtMs: 10_000,
      capturedAtMs: 14_000,
      userAgent: 'Test UA',
      hardwareConcurrency: 8,
      sensitivityPreset: 'auto',
      resolvedVolumeThreshold: 0.041,
      autoNoiseFloorRms: 0.009,
      attackFilterPreset: 'balanced',
      attackPeakMultiplier: 1.5,
      holdFilterPreset: '80ms',
      holdDurationMs: 80,
      requiredStableFrames: 3,
      analyserSampleRate: 48_000,
      analyserFftSize: 4096,
    });

    expect(snapshot.version).toBe(2);
    expect(snapshot.configuredProvider).toBe('essentia_experimental');
    expect(snapshot.runtimeProvider).toBe('spectrum');
    expect(snapshot.avgLatencyMs).toBe(2.5);
    expect(snapshot.telemetryWindowDurationSec).toBe(4);
    expect(snapshot.framesPerSecond).toBe(2.5);
    expect(snapshot.fallbackRate).toBe(0.2);
    expect(snapshot.warningRate).toBe(0.3);
    expect(snapshot.fallbackFrames).toBe(2);
    expect(snapshot.environment.hardwareConcurrency).toBe(8);
    expect(snapshot.configuration.resolvedVolumeThreshold).toBe(0.041);
    expect(snapshot.configuration.attackPeakMultiplier).toBe(1.5);
    expect(snapshot.configuration.holdDurationMs).toBe(80);
    expect(snapshot.configuration.requiredStableFrames).toBe(3);
  });

  it('formats a stable json filename', () => {
    expect(formatMicPolyphonicTelemetryFileName(Date.UTC(2026, 2, 1, 12, 34, 56))).toContain(
      'mic-poly-telemetry-2026-03-01T12-34-56'
    );
  });
});

