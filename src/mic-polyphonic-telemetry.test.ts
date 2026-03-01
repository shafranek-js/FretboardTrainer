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
    });

    expect(snapshot.configuredProvider).toBe('essentia_experimental');
    expect(snapshot.runtimeProvider).toBe('spectrum');
    expect(snapshot.avgLatencyMs).toBe(2.5);
    expect(snapshot.telemetryWindowDurationSec).toBe(4);
    expect(snapshot.fallbackFrames).toBe(2);
    expect(snapshot.environment.hardwareConcurrency).toBe(8);
  });

  it('formats a stable json filename', () => {
    expect(formatMicPolyphonicTelemetryFileName(Date.UTC(2026, 2, 1, 12, 34, 56))).toContain(
      'mic-poly-telemetry-2026-03-01T12-34-56'
    );
  });
});

