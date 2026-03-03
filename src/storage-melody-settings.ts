import type { IInstrument } from './instruments/instrument';
import {
  formatMelodyStringShift,
  normalizeMelodyStringShift,
} from './melody-string-shift';
import { clampMelodyPlaybackBpm } from './melody-timeline-duration';
import {
  formatMelodyTimelineZoomPercent,
  normalizeMelodyTimelineZoomPercent,
} from './melody-timeline-zoom';
import {
  formatMelodyTransposeSemitones,
  normalizeMelodyTransposeSemitones,
} from './melody-transposition';
import { normalizeStoredMelodyStudyRangeIndex, type ProfileSettings } from './storage-profiles';

export interface ResolvedStoredMelodySettings {
  preferredMelodyId: string;
  melodyTimelineZoomPercent: number;
  melodyDemoBpm: string;
  melodyPlaybackBpmById: Record<string, number>;
  melodyTransposeById: Record<string, number>;
  melodyStringShiftById: Record<string, number>;
  melodyStudyRangeById: Record<string, { startIndex: number; endIndex: number }>;
  melodyLoopRangeEnabled: boolean;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
}

interface MelodySettingsDomTarget {
  melodyTimelineZoom: { value: string };
  melodyTimelineZoomValue: { textContent: string };
  melodyDemoBpm: { value: string };
  melodyDemoBpmValue: { textContent: string };
  melodyLoopRange: { checked: boolean };
  melodyTranspose: { value: string };
  melodyTransposeValue: { textContent: string };
  melodyStringShift: { value: string };
  melodyStringShiftValue: { textContent: string };
}

interface MelodySettingsStateTarget {
  preferredMelodyId: string | null;
  melodyTimelineZoomPercent: number;
  melodyPlaybackBpmById: Record<string, number>;
  melodyTransposeById: Record<string, number>;
  melodyStringShiftById: Record<string, number>;
  melodyStudyRangeById: Record<string, { startIndex: number; endIndex: number }>;
  melodyStudyRangeStartIndex: number;
  melodyStudyRangeEndIndex: number;
  melodyLoopRangeEnabled: boolean;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
}

function normalizeBpmMap(value: ProfileSettings['melodyPlaybackBpmById']) {
  const normalized: Record<string, number> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
  Object.entries(value).forEach(([melodyId, bpm]) => {
    const key = melodyId.trim();
    if (!key) return;
    normalized[key] = clampMelodyPlaybackBpm(bpm);
  });
  return normalized;
}

function normalizeTransposeMap(value: ProfileSettings['melodyTransposeById']) {
  const normalized: Record<string, number> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
  Object.entries(value).forEach(([melodyId, transpose]) => {
    const key = melodyId.trim();
    if (!key) return;
    normalized[key] = normalizeMelodyTransposeSemitones(transpose);
  });
  return normalized;
}

function normalizeStringShiftMap(
  value: ProfileSettings['melodyStringShiftById'],
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>
) {
  const normalized: Record<string, number> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
  Object.entries(value).forEach(([melodyId, shift]) => {
    const key = melodyId.trim();
    if (!key) return;
    normalized[key] = normalizeMelodyStringShift(shift, instrument);
  });
  return normalized;
}

function normalizeStudyRangeMap(value: ProfileSettings['melodyStudyRangeById']) {
  const normalized: Record<string, { startIndex: number; endIndex: number }> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return normalized;
  Object.entries(value).forEach(([melodyId, range]) => {
    const key = melodyId.trim();
    if (!key || !range || typeof range !== 'object' || Array.isArray(range)) return;
    normalized[key] = {
      startIndex: normalizeStoredMelodyStudyRangeIndex((range as { startIndex?: unknown }).startIndex),
      endIndex: normalizeStoredMelodyStudyRangeIndex((range as { endIndex?: unknown }).endIndex),
    };
  });
  return normalized;
}

export function resolveStoredMelodySettings(
  safeSettings: ProfileSettings,
  instrument: Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>,
  getDefaultMelodyIdForInstrument: (instrumentName: IInstrument['name']) => string
): ResolvedStoredMelodySettings {
  return {
    preferredMelodyId:
      typeof safeSettings.selectedMelodyId === 'string' && safeSettings.selectedMelodyId.trim().length > 0
        ? safeSettings.selectedMelodyId
        : getDefaultMelodyIdForInstrument(instrument.name),
    melodyTimelineZoomPercent: normalizeMelodyTimelineZoomPercent(safeSettings.melodyTimelineZoomPercent),
    melodyDemoBpm: String(clampMelodyPlaybackBpm(safeSettings.melodyDemoBpm)),
    melodyPlaybackBpmById: normalizeBpmMap(safeSettings.melodyPlaybackBpmById),
    melodyTransposeById: normalizeTransposeMap(safeSettings.melodyTransposeById),
    melodyStringShiftById: normalizeStringShiftMap(safeSettings.melodyStringShiftById, instrument),
    melodyStudyRangeById: normalizeStudyRangeMap(safeSettings.melodyStudyRangeById),
    melodyLoopRangeEnabled: safeSettings.melodyLoopRange ?? false,
    melodyTransposeSemitones: normalizeMelodyTransposeSemitones(safeSettings.melodyTransposeSemitones),
    melodyStringShift: normalizeMelodyStringShift(safeSettings.melodyStringShift, instrument),
  };
}

export function applyStoredMelodySettings(
  resolved: ResolvedStoredMelodySettings,
  dom: MelodySettingsDomTarget,
  state: MelodySettingsStateTarget
) {
  state.preferredMelodyId = resolved.preferredMelodyId;
  state.melodyTimelineZoomPercent = resolved.melodyTimelineZoomPercent;
  dom.melodyTimelineZoom.value = String(resolved.melodyTimelineZoomPercent);
  dom.melodyTimelineZoomValue.textContent = formatMelodyTimelineZoomPercent(
    resolved.melodyTimelineZoomPercent
  );

  dom.melodyDemoBpm.value = resolved.melodyDemoBpm;
  dom.melodyDemoBpmValue.textContent = resolved.melodyDemoBpm;

  state.melodyPlaybackBpmById = resolved.melodyPlaybackBpmById;
  state.melodyTransposeById = resolved.melodyTransposeById;
  state.melodyStringShiftById = resolved.melodyStringShiftById;
  state.melodyStudyRangeById = resolved.melodyStudyRangeById;
  state.melodyStudyRangeStartIndex = 0;
  state.melodyStudyRangeEndIndex = 0;

  state.melodyLoopRangeEnabled = resolved.melodyLoopRangeEnabled;
  dom.melodyLoopRange.checked = resolved.melodyLoopRangeEnabled;

  state.melodyTransposeSemitones = resolved.melodyTransposeSemitones;
  dom.melodyTranspose.value = String(resolved.melodyTransposeSemitones);
  dom.melodyTransposeValue.textContent = formatMelodyTransposeSemitones(
    resolved.melodyTransposeSemitones
  );

  state.melodyStringShift = resolved.melodyStringShift;
  dom.melodyStringShift.value = String(resolved.melodyStringShift);
  dom.melodyStringShiftValue.textContent = formatMelodyStringShift(resolved.melodyStringShift);
}
