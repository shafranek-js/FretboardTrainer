import type { MicNoteAttackFilterPreset } from './mic-note-attack-filter';
import type { MicNoteHoldFilterPreset } from './mic-note-hold-filter';
import type { MicSensitivityPreset } from './mic-input-sensitivity';
import type { MicPolyphonicDetectorProvider } from './mic-polyphonic-detector';
import type { PerformanceMicTolerancePreset } from './performance-mic-tolerance';
import type { PerformanceTimingLeniencyPreset } from './performance-timing-forgiveness';

export interface MicPerformanceReadinessInput {
  trainingMode: string;
  inputSource: 'microphone' | 'midi';
  selectedAudioInputLabel: string;
  isListening: boolean;
  micSensitivityPreset: MicSensitivityPreset;
  micAutoNoiseFloorRms: number | null;
  micNoteAttackFilterPreset: MicNoteAttackFilterPreset;
  micNoteHoldFilterPreset: MicNoteHoldFilterPreset;
  micPolyphonicDetectorProvider: MicPolyphonicDetectorProvider;
  lastMicPolyphonicDetectorFallbackFrom: MicPolyphonicDetectorProvider | null;
  lastMicPolyphonicDetectorWarning: string | null;
  performanceMicTolerancePreset: PerformanceMicTolerancePreset;
  performanceTimingLeniencyPreset: PerformanceTimingLeniencyPreset;
  performanceMicLatencyCompensationMs: number;
  liveInputRms: number;
  liveMonophonicConfidence: number | null;
  livePitchSpreadCents: number | null;
  liveMonophonicDetectedAtMs: number | null;
  judgmentCount: number;
  judgmentTotalLatencyMs: number;
  judgmentLastLatencyMs: number | null;
  judgmentMaxLatencyMs: number;
  latencyCalibrationActive: boolean;
  nowMs: number;
}

const MIN_LATENCY_CALIBRATION_SAMPLES = 5;

function resolveLatencyCompensationRecommendationMs(input: MicPerformanceReadinessInput) {
  if (input.judgmentCount < MIN_LATENCY_CALIBRATION_SAMPLES) return null;
  const avgLatencyMs = input.judgmentTotalLatencyMs / Math.max(1, input.judgmentCount);
  const recommendedMs = Math.max(0, Math.min(250, Math.round(avgLatencyMs)));
  if (Math.abs(recommendedMs - input.performanceMicLatencyCompensationMs) < 20) {
    return null;
  }
  return recommendedMs;
}

export interface MicPerformanceReadinessView {
  tone: 'neutral' | 'success' | 'warning' | 'error';
  text: string;
  suggestedLatencyCompensationMs: number | null;
  latencyCalibrationProgressText: string | null;
}

function isBluetoothLikeLabel(label: string) {
  return /(bluetooth|airpods|buds|hands-free|headset|earbuds|wireless)/i.test(label);
}

function looksLikeDedicatedInterface(label: string) {
  return /(usb|interface|focusrite|scarlett|steinberg|behringer|line 6|irig|hi-z|asio)/i.test(label);
}

function formatLiveSignalSummary(input: MicPerformanceReadinessInput) {
  if (!input.isListening || input.inputSource !== 'microphone') return null;
  if (
    input.liveMonophonicDetectedAtMs === null ||
    input.nowMs - input.liveMonophonicDetectedAtMs > 1500
  ) {
    if (input.liveInputRms < 0.008) {
      return 'Live signal: very quiet. Move closer to the mic or pick harder.';
    }
    return 'Live signal: waiting for a clean single-note attack.';
  }

  if (
    typeof input.liveMonophonicConfidence === 'number' &&
    input.liveMonophonicConfidence < 0.58
  ) {
    const spreadText =
      typeof input.livePitchSpreadCents === 'number'
        ? ` Pitch spread ${input.livePitchSpreadCents.toFixed(0)}c.`
        : '';
    return `Live signal: unstable pitch confidence.${spreadText} Mute ringing strings and play a cleaner attack.`;
  }

  return 'Live signal: confident single-note detection.';
}

export function buildMicPerformanceReadinessView(
  input: MicPerformanceReadinessInput
): MicPerformanceReadinessView {
  if (input.inputSource !== 'microphone') {
    return {
      tone: 'neutral',
      text: 'Mic performance readiness applies only to microphone input.',
      suggestedLatencyCompensationMs: null,
      latencyCalibrationProgressText: null,
    };
  }

  const issues: string[] = [];
  let tone: MicPerformanceReadinessView['tone'] = 'success';

  if (isBluetoothLikeLabel(input.selectedAudioInputLabel)) {
    tone = 'error';
    issues.push('Bluetooth/headset mic likely adds latency. Prefer wired mic or audio interface.');
  }

  if (
    !isBluetoothLikeLabel(input.selectedAudioInputLabel) &&
    !looksLikeDedicatedInterface(input.selectedAudioInputLabel) &&
    input.trainingMode === 'performance'
  ) {
    if (tone === 'success') tone = 'warning';
    issues.push('Built-in/default mic can work, but a close wired mic or audio interface usually improves attack detection.');
  }

  if (input.micSensitivityPreset !== 'auto' || input.micAutoNoiseFloorRms === null) {
    if (tone !== 'error') tone = 'warning';
    issues.push('Run room-noise calibration and keep Mic Sensitivity on Auto for performance mode.');
  }

  if (input.micNoteAttackFilterPreset === 'off') {
    if (tone !== 'error') tone = 'warning';
    issues.push('Note Attack Filter is Off. Balanced is safer for guitar onset judging.');
  }

  if (input.micNoteHoldFilterPreset === 'off') {
    if (tone !== 'error') tone = 'warning';
    issues.push('Min Note Hold Time is Off. 40-80 ms usually reduces false retriggers.');
  }

  if (input.micPolyphonicDetectorProvider !== 'spectrum') {
    if (tone !== 'error') tone = 'warning';
    issues.push('Experimental poly detector selected. Use Spectrum for the most predictable live path.');
  }

  if (input.lastMicPolyphonicDetectorFallbackFrom || input.lastMicPolyphonicDetectorWarning) {
    if (tone !== 'error') tone = 'warning';
    issues.push('Detector fallback/warnings were seen recently. Expect weaker microphone confidence until input quality improves.');
  }

  if (input.judgmentCount > 0) {
    const avgLatencyMs = input.judgmentTotalLatencyMs / Math.max(1, input.judgmentCount);
    const lastLatencyMs = input.judgmentLastLatencyMs ?? avgLatencyMs;
    const maxLatencyMs = input.judgmentMaxLatencyMs;
    const calibrationReady = input.judgmentCount >= MIN_LATENCY_CALIBRATION_SAMPLES;
    if (avgLatencyMs >= 180 || maxLatencyMs >= 260) {
      if (tone !== 'error') tone = 'warning';
      issues.push(
        `Recent mic judgment latency is high (avg ${avgLatencyMs.toFixed(0)} ms, last ${lastLatencyMs.toFixed(0)} ms, max ${maxLatencyMs.toFixed(0)} ms). Prefer wired input or a closer mic.`
      );
    } else {
      issues.push(
        `Recent mic judgment latency: avg ${avgLatencyMs.toFixed(0)} ms, last ${lastLatencyMs.toFixed(0)} ms.`
      );
    }

    if (!calibrationReady) {
      if (tone === 'success') tone = 'warning';
      issues.push(
        `Latency calibration is still warming up: play ${MIN_LATENCY_CALIBRATION_SAMPLES} clean single-note attacks (${input.judgmentCount}/${MIN_LATENCY_CALIBRATION_SAMPLES}).`
      );
    }

    const recommendedCompensationMs = resolveLatencyCompensationRecommendationMs(input);
    if (recommendedCompensationMs !== null) {
      issues.push(
        `Try Mic Latency Compensation near ${recommendedCompensationMs} ms (current ${input.performanceMicLatencyCompensationMs} ms).`
      );
    }
  }

  let latencyCalibrationProgressText: string | null = null;
  if (input.latencyCalibrationActive) {
    const completedSamples = Math.min(input.judgmentCount, MIN_LATENCY_CALIBRATION_SAMPLES);
    if (completedSamples < MIN_LATENCY_CALIBRATION_SAMPLES) {
      if (tone === 'success') tone = 'warning';
      latencyCalibrationProgressText =
        `Latency calibration: collect ${MIN_LATENCY_CALIBRATION_SAMPLES} clean judged notes (${completedSamples}/${MIN_LATENCY_CALIBRATION_SAMPLES}).`;
      issues.push(
        'Latency calibration is active. Start a microphone performance session and play clean single-note attacks until the sample target is reached.'
      );
    } else {
      latencyCalibrationProgressText =
        `Latency calibration pass complete (${completedSamples}/${MIN_LATENCY_CALIBRATION_SAMPLES}).`;
      issues.push('Latency calibration collected enough judged notes for a stable recommendation.');
    }
  }

  if (input.performanceMicTolerancePreset === 'strict') {
    if (tone === 'success') tone = 'warning';
    issues.push('Strict pitch tolerance is unforgiving. Normal is usually better for live microphone practice.');
  }

  if (input.performanceTimingLeniencyPreset === 'strict') {
    if (tone === 'success') tone = 'warning';
    issues.push('Strict timing leniency behaves more like an exam than practice.');
  }

  const liveSignalSummary = formatLiveSignalSummary(input);
  if (tone === 'success' && input.trainingMode === 'performance') {
    issues.push('Mic path looks ready for performance practice.');
  } else if (tone === 'success') {
    issues.push('Mic path looks healthy.');
  }

  if (liveSignalSummary) {
    issues.push(liveSignalSummary);
  }

  const prefix =
    tone === 'success'
      ? 'Mic performance readiness: Ready.'
      : tone === 'warning'
        ? 'Mic performance readiness: Caution.'
        : tone === 'error'
          ? 'Mic performance readiness: High latency risk.'
          : 'Mic performance readiness: Neutral.';

  return {
    tone,
    text: `${prefix} ${issues.join(' ')}`.trim(),
    suggestedLatencyCompensationMs: resolveLatencyCompensationRecommendationMs(input),
    latencyCalibrationProgressText,
  };
}
