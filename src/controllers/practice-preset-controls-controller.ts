import {
  getPracticeInputPresetConfig,
  getPracticeTimingPresetConfig,
  normalizePracticeInputPreset,
  normalizePracticeTimingPreset,
} from '../practice-presets';
import { normalizePerformanceMicLatencyCompensationMs } from '../performance-mic-latency-compensation';
import { normalizePerformanceMicTolerancePreset } from '../performance-mic-tolerance';
import { normalizePerformanceTimingLeniencyPreset } from '../performance-timing-forgiveness';

interface PracticePresetControlsDom {
  micDirectInputMode: HTMLInputElement;
  practiceInputPreset: HTMLSelectElement;
  micSensitivityPreset: HTMLSelectElement;
  micNoteAttackFilter: HTMLSelectElement;
  micNoteHoldFilter: HTMLSelectElement;
  performanceMicTolerancePreset: HTMLSelectElement;
  performanceTimingLeniencyPreset: HTMLSelectElement;
  practiceTimingPreset: HTMLSelectElement;
  performanceMicLatencyCompensation: HTMLInputElement;
  performanceMicLatencyCompensationExact: HTMLInputElement;
  performanceMicLatencyCompensationValue: HTMLElement;
}

interface PracticePresetControlsState {
  isDirectInputMode: boolean;
  ignorePromptAudioUntilMs: number;
  micSensitivityPreset: string;
  micNoteAttackFilterPreset: string;
  micNoteHoldFilterPreset: string;
  performanceMicTolerancePreset: string;
  performanceTimingLeniencyPreset: string;
  performanceMicLatencyCompensationMs: number;
  micPerformanceSuggestedLatencyMs: number | null;
  micPerformanceLatencyCalibrationActive: boolean;
  micPerformanceJudgmentCount: number;
  micPerformanceJudgmentTotalLatencyMs: number;
  micPerformanceJudgmentLastLatencyMs: number | null;
  micPerformanceJudgmentMaxLatencyMs: number;
}

export interface PracticePresetControlsControllerDeps {
  dom: PracticePresetControlsDom;
  state: PracticePresetControlsState;
  refreshMicPerformanceReadinessUi: () => void;
  syncPracticePresetUi: () => void;
  updateMicNoiseGateInfo: () => void;
  saveSettings: () => void;
}

export function createPracticePresetControlsController(deps: PracticePresetControlsControllerDeps) {
  function applyPerformanceMicLatencyCompensation(value: unknown) {
    deps.state.performanceMicLatencyCompensationMs = normalizePerformanceMicLatencyCompensationMs(value);
    deps.dom.performanceMicLatencyCompensation.value = String(deps.state.performanceMicLatencyCompensationMs);
    deps.dom.performanceMicLatencyCompensationExact.value = String(deps.state.performanceMicLatencyCompensationMs);
    deps.dom.performanceMicLatencyCompensationValue.textContent = `${deps.state.performanceMicLatencyCompensationMs} ms`;
    deps.refreshMicPerformanceReadinessUi();
    deps.saveSettings();
  }

  function register() {
    deps.dom.micDirectInputMode.addEventListener('change', () => {
      deps.state.isDirectInputMode = deps.dom.micDirectInputMode.checked;
      if (deps.state.isDirectInputMode) {
        deps.state.ignorePromptAudioUntilMs = 0;
      }
      deps.refreshMicPerformanceReadinessUi();
      deps.syncPracticePresetUi();
      deps.saveSettings();
    });

    deps.dom.practiceInputPreset.addEventListener('change', () => {
      const preset = normalizePracticeInputPreset(deps.dom.practiceInputPreset.value);
      if (preset === 'custom') {
        deps.syncPracticePresetUi();
        return;
      }
      const config = getPracticeInputPresetConfig(preset);
      deps.state.micSensitivityPreset = config.micSensitivityPreset;
      deps.dom.micSensitivityPreset.value = deps.state.micSensitivityPreset;
      deps.state.micNoteAttackFilterPreset = config.micNoteAttackFilterPreset;
      deps.dom.micNoteAttackFilter.value = deps.state.micNoteAttackFilterPreset;
      deps.state.micNoteHoldFilterPreset = config.micNoteHoldFilterPreset;
      deps.dom.micNoteHoldFilter.value = deps.state.micNoteHoldFilterPreset;
      deps.state.isDirectInputMode = config.isDirectInputMode;
      deps.dom.micDirectInputMode.checked = deps.state.isDirectInputMode;
      if (deps.state.isDirectInputMode) {
        deps.state.ignorePromptAudioUntilMs = 0;
      }
      deps.updateMicNoiseGateInfo();
      deps.refreshMicPerformanceReadinessUi();
      deps.syncPracticePresetUi();
      deps.saveSettings();
    });

    deps.dom.performanceMicTolerancePreset.addEventListener('change', () => {
      deps.state.performanceMicTolerancePreset = normalizePerformanceMicTolerancePreset(
        deps.dom.performanceMicTolerancePreset.value
      );
      deps.dom.performanceMicTolerancePreset.value = deps.state.performanceMicTolerancePreset;
      deps.refreshMicPerformanceReadinessUi();
      deps.syncPracticePresetUi();
      deps.saveSettings();
    });

    deps.dom.performanceTimingLeniencyPreset.addEventListener('change', () => {
      deps.state.performanceTimingLeniencyPreset = normalizePerformanceTimingLeniencyPreset(
        deps.dom.performanceTimingLeniencyPreset.value
      );
      deps.dom.performanceTimingLeniencyPreset.value = deps.state.performanceTimingLeniencyPreset;
      deps.refreshMicPerformanceReadinessUi();
      deps.syncPracticePresetUi();
      deps.saveSettings();
    });

    deps.dom.practiceTimingPreset.addEventListener('change', () => {
      const preset = normalizePracticeTimingPreset(deps.dom.practiceTimingPreset.value);
      if (preset === 'custom') {
        deps.syncPracticePresetUi();
        return;
      }
      const config = getPracticeTimingPresetConfig(preset);
      deps.state.performanceMicTolerancePreset = config.performanceMicTolerancePreset;
      deps.dom.performanceMicTolerancePreset.value = deps.state.performanceMicTolerancePreset;
      deps.state.performanceTimingLeniencyPreset = config.performanceTimingLeniencyPreset;
      deps.dom.performanceTimingLeniencyPreset.value = deps.state.performanceTimingLeniencyPreset;
      deps.refreshMicPerformanceReadinessUi();
      deps.syncPracticePresetUi();
      deps.saveSettings();
    });

    deps.dom.performanceMicLatencyCompensation.addEventListener('input', () => {
      applyPerformanceMicLatencyCompensation(deps.dom.performanceMicLatencyCompensation.value);
    });

    deps.dom.performanceMicLatencyCompensationExact.addEventListener('input', () => {
      const rawValue = deps.dom.performanceMicLatencyCompensationExact.value.trim();
      if (rawValue.length === 0) return;
      applyPerformanceMicLatencyCompensation(rawValue);
    });

    deps.dom.performanceMicLatencyCompensationExact.addEventListener('blur', () => {
      if (deps.dom.performanceMicLatencyCompensationExact.value.trim().length > 0) return;
      deps.dom.performanceMicLatencyCompensationExact.value = String(deps.state.performanceMicLatencyCompensationMs);
    });
  }

  function applySuggestedMicLatency() {
    const suggestedMs = normalizePerformanceMicLatencyCompensationMs(deps.state.micPerformanceSuggestedLatencyMs);
    applyPerformanceMicLatencyCompensation(suggestedMs);
  }

  function startMicLatencyCalibration() {
    deps.state.micPerformanceLatencyCalibrationActive = true;
    deps.state.micPerformanceJudgmentCount = 0;
    deps.state.micPerformanceJudgmentTotalLatencyMs = 0;
    deps.state.micPerformanceJudgmentLastLatencyMs = null;
    deps.state.micPerformanceJudgmentMaxLatencyMs = 0;
    deps.state.micPerformanceSuggestedLatencyMs = null;
    deps.refreshMicPerformanceReadinessUi();
  }

  return {
    applySuggestedMicLatency,
    register,
    startMicLatencyCalibration,
  };
}
