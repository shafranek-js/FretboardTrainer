import { describe, expect, it } from 'vitest';
import { buildMicPerformanceReadinessView } from './mic-performance-readiness';

function createInput(overrides: Partial<Parameters<typeof buildMicPerformanceReadinessView>[0]> = {}) {
  return {
    trainingMode: 'performance',
    inputSource: 'microphone' as const,
    selectedAudioInputLabel: 'USB Audio Interface',
    isListening: false,
    micSensitivityPreset: 'auto' as const,
    micAutoNoiseFloorRms: 0.003,
    micNoteAttackFilterPreset: 'balanced' as const,
    micNoteHoldFilterPreset: '80ms' as const,
    micPolyphonicDetectorProvider: 'spectrum' as const,
    lastMicPolyphonicDetectorFallbackFrom: null,
    lastMicPolyphonicDetectorWarning: null,
    performanceMicTolerancePreset: 'normal' as const,
    performanceTimingLeniencyPreset: 'normal' as const,
    performanceMicLatencyCompensationMs: 0,
    liveInputRms: 0,
    liveMonophonicConfidence: null,
    livePitchSpreadCents: null,
    liveMonophonicDetectedAtMs: null,
    judgmentCount: 0,
    judgmentTotalLatencyMs: 0,
    judgmentLastLatencyMs: null,
    judgmentMaxLatencyMs: 0,
    latencyCalibrationActive: false,
    nowMs: 0,
    ...overrides,
  };
}

describe('mic-performance-readiness', () => {
  it('reports ready state for a calibrated wired mic path', () => {
    const result = buildMicPerformanceReadinessView(createInput());
    expect(result.tone).toBe('success');
    expect(result.text).toContain('Ready');
  });

  it('warns when calibration is missing', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        micSensitivityPreset: 'normal',
        micAutoNoiseFloorRms: null,
      })
    );
    expect(result.tone).toBe('warning');
    expect(result.text).toContain('room-noise calibration');
  });

  it('warns that built-in/default mics are weaker for performance mode', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        selectedAudioInputLabel: 'Default microphone',
      })
    );
    expect(result.tone).toBe('warning');
    expect(result.text).toContain('Built-in/default mic');
  });

  it('flags bluetooth-like device labels as latency risk', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        selectedAudioInputLabel: 'AirPods Hands-Free AG Audio',
      })
    );
    expect(result.tone).toBe('error');
    expect(result.text).toContain('Bluetooth/headset mic');
  });

  it('reports unstable live signal when monophonic confidence is low', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        isListening: true,
        liveInputRms: 0.02,
        liveMonophonicConfidence: 0.31,
        livePitchSpreadCents: 42,
        liveMonophonicDetectedAtMs: 1000,
        nowMs: 1500,
      })
    );
    expect(result.text).toContain('unstable pitch confidence');
    expect(result.text).toContain('42c');
  });

  it('warns when recent judgment latency is high', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        judgmentCount: 5,
        judgmentTotalLatencyMs: 1200,
        judgmentLastLatencyMs: 240,
        judgmentMaxLatencyMs: 310,
      })
    );
    expect(result.tone).toBe('warning');
    expect(result.text).toContain('Recent mic judgment latency is high');
    expect(result.text).toContain('avg 240 ms');
  });

  it('recommends a mic latency compensation value from measured judgment latency', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        judgmentCount: 5,
        judgmentTotalLatencyMs: 800,
        judgmentLastLatencyMs: 150,
        judgmentMaxLatencyMs: 190,
        performanceMicLatencyCompensationMs: 40,
      })
    );
    expect(result.text).toContain('Try Mic Latency Compensation near 160 ms');
    expect(result.text).toContain('current 40 ms');
    expect(result.suggestedLatencyCompensationMs).toBe(160);
  });

  it('shows calibration warmup guidance before enough latency samples are collected', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        judgmentCount: 2,
        judgmentTotalLatencyMs: 280,
        judgmentLastLatencyMs: 150,
        judgmentMaxLatencyMs: 160,
        latencyCalibrationActive: true,
      })
    );
    expect(result.tone).toBe('warning');
    expect(result.text).toContain('Latency calibration is still warming up');
    expect(result.text).toContain('2/5');
    expect(result.suggestedLatencyCompensationMs).toBeNull();
    expect(result.latencyCalibrationProgressText).toContain('2/5');
  });

  it('marks calibration pass complete after enough judged notes are collected', () => {
    const result = buildMicPerformanceReadinessView(
      createInput({
        judgmentCount: 5,
        judgmentTotalLatencyMs: 750,
        judgmentLastLatencyMs: 145,
        judgmentMaxLatencyMs: 170,
        latencyCalibrationActive: true,
      })
    );
    expect(result.latencyCalibrationProgressText).toContain('5/5');
    expect(result.text).toContain('Latency calibration collected enough judged notes');
  });
});
