function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export interface StudyMelodyMicTuningSettings {
  gatePercent: number;
  noiseGuardPercent: number;
  silenceResetFrames: number;
  stableFrames: number;
  preEmphasisFrequencyHz: number;
  preEmphasisGainDb: number;
}

export const DEFAULT_STUDY_MELODY_MIC_TUNING: StudyMelodyMicTuningSettings = {
  gatePercent: 100,
  noiseGuardPercent: 100,
  silenceResetFrames: 0,
  stableFrames: 0,
  preEmphasisFrequencyHz: 300,
  preEmphasisGainDb: 5,
};

function normalizeIntegerSetting(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.round(value), min, max);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return clamp(Math.round(parsed), min, max);
    }
  }

  return fallback;
}

export function normalizeStudyMelodyMicGatePercent(value: unknown) {
  return normalizeIntegerSetting(value, DEFAULT_STUDY_MELODY_MIC_TUNING.gatePercent, 60, 140);
}

export function normalizeStudyMelodyMicNoiseGuardPercent(value: unknown) {
  return normalizeIntegerSetting(value, DEFAULT_STUDY_MELODY_MIC_TUNING.noiseGuardPercent, 60, 140);
}

export function normalizeStudyMelodyMicSilenceResetFrames(value: unknown) {
  return normalizeIntegerSetting(value, DEFAULT_STUDY_MELODY_MIC_TUNING.silenceResetFrames, 0, 8);
}

export function normalizeStudyMelodyMicStableFrames(value: unknown) {
  return normalizeIntegerSetting(value, DEFAULT_STUDY_MELODY_MIC_TUNING.stableFrames, 0, 3);
}

export function normalizeStudyMelodyPreEmphasisFrequencyHz(value: unknown) {
  return normalizeIntegerSetting(value, DEFAULT_STUDY_MELODY_MIC_TUNING.preEmphasisFrequencyHz, 200, 600);
}

export function normalizeStudyMelodyPreEmphasisGainDb(value: unknown) {
  return normalizeIntegerSetting(value, DEFAULT_STUDY_MELODY_MIC_TUNING.preEmphasisGainDb, 0, 8);
}

export function formatStudyMelodyMicPercent(value: number) {
  return `${value}%`;
}

export function formatStudyMelodyMicAutoFrameValue(value: number) {
  return value <= 0 ? 'Auto' : `${value}f`;
}

export function formatStudyMelodyPreEmphasisFrequency(value: number) {
  return `${value} Hz`;
}

export function formatStudyMelodyPreEmphasisGain(value: number) {
  return value <= 0 ? 'Off' : `+${value} dB`;
}

export function resolveEffectiveStudyMelodySilenceResetFrames(
  automaticFrames: number,
  manualFrames: number
) {
  return manualFrames > 0 ? manualFrames : automaticFrames;
}

export function resolveEffectiveStudyMelodyStableFrames(
  automaticFrames: number,
  manualFrames: number
) {
  return manualFrames > 0 ? manualFrames : automaticFrames;
}
