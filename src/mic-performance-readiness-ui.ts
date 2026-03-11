import { dom } from './dom';
import { state } from './state';
import { buildMicPerformanceReadinessView } from './mic-performance-readiness';

function applyToneClasses(tone: 'neutral' | 'success' | 'warning' | 'error') {
  dom.micPerformanceInfo.classList.remove(
    'text-slate-200',
    'text-emerald-100',
    'text-amber-100',
    'text-rose-100',
    'bg-slate-900/25',
    'bg-emerald-950/30',
    'bg-amber-950/30',
    'bg-rose-950/30',
    'border-slate-600/60',
    'border-emerald-700/60',
    'border-amber-700/60',
    'border-rose-700/60'
  );

  if (tone === 'success') {
    dom.micPerformanceInfo.classList.add('text-emerald-100', 'bg-emerald-950/30', 'border-emerald-700/60');
    return;
  }
  if (tone === 'warning') {
    dom.micPerformanceInfo.classList.add('text-amber-100', 'bg-amber-950/30', 'border-amber-700/60');
    return;
  }
  if (tone === 'error') {
    dom.micPerformanceInfo.classList.add('text-rose-100', 'bg-rose-950/30', 'border-rose-700/60');
    return;
  }

  dom.micPerformanceInfo.classList.add('text-slate-200', 'bg-slate-900/25', 'border-slate-600/60');
}

export function refreshMicPerformanceReadinessUi(nowMs = Date.now()) {
  const selectedAudioInputLabel =
    dom.audioInputDevice.selectedOptions[0]?.textContent?.trim() || 'Default microphone';

  const view = buildMicPerformanceReadinessView({
    trainingMode: dom.trainingMode.value,
    inputSource: state.inputSource,
    selectedAudioInputLabel,
    isListening: state.isListening,
    micSensitivityPreset: state.micSensitivityPreset,
    micAutoNoiseFloorRms: state.micAutoNoiseFloorRms,
    micNoteAttackFilterPreset: state.micNoteAttackFilterPreset,
    micNoteHoldFilterPreset: state.micNoteHoldFilterPreset,
    micPolyphonicDetectorProvider: state.micPolyphonicDetectorProvider,
    lastMicPolyphonicDetectorFallbackFrom: state.lastMicPolyphonicDetectorFallbackFrom,
    lastMicPolyphonicDetectorWarning: state.lastMicPolyphonicDetectorWarning,
    performanceMicTolerancePreset: state.performanceMicTolerancePreset,
    performanceTimingLeniencyPreset: state.performanceTimingLeniencyPreset,
    performanceMicLatencyCompensationMs: state.performanceMicLatencyCompensationMs,
    liveInputRms: state.micLastInputRms,
    liveMonophonicConfidence: state.micLastMonophonicConfidence,
    livePitchSpreadCents: state.micLastMonophonicPitchSpreadCents,
    liveMonophonicDetectedAtMs: state.micLastMonophonicDetectedAtMs,
    judgmentCount: state.micPerformanceJudgmentCount,
    judgmentTotalLatencyMs: state.micPerformanceJudgmentTotalLatencyMs,
    judgmentLastLatencyMs: state.micPerformanceJudgmentLastLatencyMs,
    judgmentMaxLatencyMs: state.micPerformanceJudgmentMaxLatencyMs,
    latencyCalibrationActive: state.micPerformanceLatencyCalibrationActive,
    onsetGateStatus: state.micPerformanceOnsetGateStatus,
    onsetGateReason: state.micPerformanceOnsetGateReason,
    onsetGateAtMs: state.micPerformanceOnsetGateAtMs,
    appliedEchoCancellation: state.activeAudioInputTrackSettings?.echoCancellation ?? null,
    appliedNoiseSuppression: state.activeAudioInputTrackSettings?.noiseSuppression ?? null,
    appliedAutoGainControl: state.activeAudioInputTrackSettings?.autoGainControl ?? null,
    appliedChannelCount: state.activeAudioInputTrackSettings?.channelCount ?? null,
    appliedContentHint: state.activeAudioInputTrackContentHint ?? null,
    onsetRejectedWeakAttackCount: state.micPerformanceOnsetRejectedWeakAttackCount,
    onsetRejectedLowConfidenceCount: state.micPerformanceOnsetRejectedLowConfidenceCount,
    onsetRejectedLowVoicingCount: state.micPerformanceOnsetRejectedLowVoicingCount,
    onsetRejectedShortHoldCount: state.micPerformanceOnsetRejectedShortHoldCount,
    nowMs,
  });

  dom.micPerformanceInfo.textContent = view.text;
  state.micPerformanceSuggestedLatencyMs = view.suggestedLatencyCompensationMs;
  dom.applySuggestedMicLatencyBtn.classList.toggle('hidden', view.suggestedLatencyCompensationMs === null);
  dom.startMicLatencyCalibrationBtn.textContent = state.micPerformanceLatencyCalibrationActive
    ? 'Restart Latency Calibration'
    : 'Start Latency Calibration';
  if (view.latencyCalibrationProgressText) {
    dom.startMicLatencyCalibrationBtn.title = view.latencyCalibrationProgressText;
  } else {
    dom.startMicLatencyCalibrationBtn.removeAttribute('title');
  }
  applyToneClasses(view.tone);
}
