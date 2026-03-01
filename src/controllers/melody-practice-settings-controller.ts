import type { IInstrument } from '../instruments/instrument';
import { getMelodyById, listMelodiesForInstrument } from '../melody-library';
import {
  clearMelodyTransposeCache,
  formatMelodyTransposeSemitones,
  normalizeMelodyTransposeSemitones,
} from '../melody-transposition';
import {
  clearMelodyStringShiftCache,
  coerceMelodyStringShiftToFeasible,
  formatMelodyStringShift,
  getMelodyWithPracticeAdjustments,
  isMelodyStringShiftFeasible,
  normalizeMelodyStringShift,
} from '../melody-string-shift';
import {
  formatMelodyStudyRange,
  getMelodyStudyRangeLength,
  isDefaultMelodyStudyRange,
  normalizeMelodyStudyRange,
  type MelodyStudyRange,
} from '../melody-study-range';

interface MelodyPracticeSettingsState {
  preferredMelodyId: string | null;
  currentInstrument: IInstrument;
  melodyTransposeById?: Record<string, number>;
  melodyTransposeSemitones: number;
  melodyStringShiftById?: Record<string, number>;
  melodyStringShift: number;
  melodyStudyRangeById?: Record<string, MelodyStudyRange>;
  melodyStudyRangeStartIndex: number;
  melodyStudyRangeEndIndex: number;
  melodyLoopRangeEnabled: boolean;
}

interface MelodyPracticeSettingsDom {
  melodySelector: HTMLSelectElement;
  melodyTranspose: HTMLInputElement;
  melodyTransposeValue: HTMLElement;
  melodyStringShift: HTMLInputElement;
  melodyStringShiftValue: HTMLElement;
  melodyStudyStart: HTMLInputElement;
  melodyStudyEnd: HTMLInputElement;
  melodyStudyValue: HTMLElement;
  melodyStudyResetBtn: HTMLButtonElement;
  melodyLoopRange: HTMLInputElement;
}

interface MelodyPracticeSettingsControllerDeps {
  dom: MelodyPracticeSettingsDom;
  state: MelodyPracticeSettingsState;
  clearPreviewState(): void;
  renderTimeline(): void;
}

function formatMelodySelectorOptionLabel(
  melody: { id: string; name: string; source: 'builtin' | 'custom' },
  transposeSemitones: number
) {
  const baseLabel = melody.source === 'custom' ? `${melody.name} (Custom)` : melody.name;
  const normalizedTranspose = normalizeMelodyTransposeSemitones(transposeSemitones);
  if (normalizedTranspose === 0) return baseLabel;
  return `${baseLabel} [${formatMelodyTransposeSemitones(normalizedTranspose)}]`;
}

export function createMelodyPracticeSettingsController(deps: MelodyPracticeSettingsControllerDeps) {
  function getSelectedMelodyId() {
    const selectedMelodyId = deps.dom.melodySelector.value.trim();
    return selectedMelodyId.length > 0 ? selectedMelodyId : null;
  }

  function getStoredMelodyTransposeSemitones(melodyId: string | null) {
    const transposeById = deps.state.melodyTransposeById ?? {};
    if (melodyId && Object.prototype.hasOwnProperty.call(transposeById, melodyId)) {
      return normalizeMelodyTransposeSemitones(transposeById[melodyId]);
    }
    return 0;
  }

  function setStoredMelodyTransposeSemitones(melodyId: string | null, semitones: number) {
    deps.state.melodyTransposeById = deps.state.melodyTransposeById ?? {};
    const normalized = normalizeMelodyTransposeSemitones(semitones);
    deps.state.melodyTransposeSemitones = normalized;
    if (melodyId) {
      if (normalized === 0) {
        delete deps.state.melodyTransposeById[melodyId];
      } else {
        deps.state.melodyTransposeById[melodyId] = normalized;
      }
    }
    return normalized;
  }

  function getStoredMelodyStringShift(melodyId: string | null) {
    const shiftById = deps.state.melodyStringShiftById ?? {};
    if (melodyId && Object.prototype.hasOwnProperty.call(shiftById, melodyId)) {
      return normalizeMelodyStringShift(shiftById[melodyId], deps.state.currentInstrument);
    }
    return 0;
  }

  function setStoredMelodyStringShift(melodyId: string | null, stringShift: number) {
    deps.state.melodyStringShiftById = deps.state.melodyStringShiftById ?? {};
    const normalized = normalizeMelodyStringShift(stringShift, deps.state.currentInstrument);
    deps.state.melodyStringShift = normalized;
    if (melodyId) {
      if (normalized === 0) {
        delete deps.state.melodyStringShiftById[melodyId];
      } else {
        deps.state.melodyStringShiftById[melodyId] = normalized;
      }
    }
    return normalized;
  }

  function getStoredMelodyStudyRange(melodyId: string | null, totalEvents: number) {
    const stored = melodyId ? deps.state.melodyStudyRangeById?.[melodyId] : null;
    return normalizeMelodyStudyRange(stored, totalEvents);
  }

  function setStoredMelodyStudyRange(
    melodyId: string | null,
    totalEvents: number,
    range: Partial<MelodyStudyRange> | null | undefined
  ) {
    deps.state.melodyStudyRangeById = deps.state.melodyStudyRangeById ?? {};
    const normalized = normalizeMelodyStudyRange(range, totalEvents);
    deps.state.melodyStudyRangeStartIndex = normalized.startIndex;
    deps.state.melodyStudyRangeEndIndex = normalized.endIndex;

    if (melodyId) {
      if (isDefaultMelodyStudyRange(normalized, totalEvents)) {
        delete deps.state.melodyStudyRangeById[melodyId];
      } else {
        deps.state.melodyStudyRangeById[melodyId] = normalized;
      }
    }

    return normalized;
  }

  function refreshMelodySelectorOptionLabels() {
    const melodies = listMelodiesForInstrument(deps.state.currentInstrument);
    const labelById = new Map(
      melodies.map((melody) => [
        melody.id,
        formatMelodySelectorOptionLabel(melody, getStoredMelodyTransposeSemitones(melody.id)),
      ])
    );

    Array.from(deps.dom.melodySelector.options).forEach((option) => {
      option.textContent = labelById.get(option.value) ?? option.textContent;
    });
  }

  function syncMelodyTransposeDisplay() {
    const normalized = normalizeMelodyTransposeSemitones(deps.state.melodyTransposeSemitones);
    deps.state.melodyTransposeSemitones = normalized;
    deps.dom.melodyTranspose.value = String(normalized);
    deps.dom.melodyTransposeValue.textContent = formatMelodyTransposeSemitones(normalized);
  }

  function syncMelodyStringShiftDisplay() {
    const normalized = normalizeMelodyStringShift(deps.state.melodyStringShift, deps.state.currentInstrument);
    deps.state.melodyStringShift = normalized;
    const maxAbsoluteShift = Math.max(0, deps.state.currentInstrument.STRING_ORDER.length - 1);
    deps.dom.melodyStringShift.min = String(-maxAbsoluteShift);
    deps.dom.melodyStringShift.max = String(maxAbsoluteShift);
    deps.dom.melodyStringShift.value = String(normalized);
    deps.dom.melodyStringShiftValue.textContent = formatMelodyStringShift(normalized);
  }

  function syncMelodyStudyRangeDisplay(totalEvents: number) {
    const normalized = normalizeMelodyStudyRange(
      {
        startIndex: deps.state.melodyStudyRangeStartIndex,
        endIndex: deps.state.melodyStudyRangeEndIndex,
      },
      totalEvents
    );
    deps.state.melodyStudyRangeStartIndex = normalized.startIndex;
    deps.state.melodyStudyRangeEndIndex = normalized.endIndex;

    const hasEvents = totalEvents > 0;
    const maxStep = Math.max(1, totalEvents);
    deps.dom.melodyStudyStart.min = hasEvents ? '1' : '0';
    deps.dom.melodyStudyStart.max = String(maxStep);
    deps.dom.melodyStudyEnd.min = hasEvents ? '1' : '0';
    deps.dom.melodyStudyEnd.max = String(maxStep);
    deps.dom.melodyStudyStart.disabled = !hasEvents;
    deps.dom.melodyStudyEnd.disabled = !hasEvents;
    deps.dom.melodyStudyStart.value = hasEvents ? String(normalized.startIndex + 1) : '';
    deps.dom.melodyStudyEnd.value = hasEvents ? String(normalized.endIndex + 1) : '';
    deps.dom.melodyStudyValue.textContent = hasEvents
      ? `${formatMelodyStudyRange(normalized, totalEvents)} | ${getMelodyStudyRangeLength(normalized, totalEvents)} steps`
      : 'No steps';
    deps.dom.melodyStudyResetBtn.disabled = !hasEvents || isDefaultMelodyStudyRange(normalized, totalEvents);
  }

  function syncMelodyLoopRangeDisplay() {
    deps.dom.melodyLoopRange.checked = deps.state.melodyLoopRangeEnabled;
    deps.dom.melodyLoopRange.disabled = !getSelectedMelodyId();
  }

  function hydrateMelodyTransposeForSelectedMelody(options?: { migrateLegacyValue?: boolean }) {
    const selectedMelodyId = getSelectedMelodyId();
    deps.state.melodyTransposeById = deps.state.melodyTransposeById ?? {};
    const transposeById = deps.state.melodyTransposeById;
    if (
      options?.migrateLegacyValue &&
      selectedMelodyId &&
      !Object.prototype.hasOwnProperty.call(transposeById, selectedMelodyId) &&
      Object.keys(transposeById).length === 0 &&
      normalizeMelodyTransposeSemitones(deps.state.melodyTransposeSemitones) !== 0
    ) {
      setStoredMelodyTransposeSemitones(selectedMelodyId, deps.state.melodyTransposeSemitones);
    } else {
      deps.state.melodyTransposeSemitones = getStoredMelodyTransposeSemitones(selectedMelodyId);
    }
    syncMelodyTransposeDisplay();
    refreshMelodySelectorOptionLabels();
  }

  function hydrateMelodyStringShiftForSelectedMelody() {
    const selectedMelodyId = getSelectedMelodyId();
    const baseMelody = selectedMelodyId
      ? getMelodyById(selectedMelodyId, deps.state.currentInstrument)
      : null;
    if (!baseMelody) {
      deps.state.melodyStringShift = 0;
      syncMelodyStringShiftDisplay();
      return;
    }

    const transposedMelody = getMelodyWithPracticeAdjustments(
      baseMelody,
      deps.state.melodyTransposeSemitones,
      0,
      deps.state.currentInstrument
    );
    const preferredShift = getStoredMelodyStringShift(selectedMelodyId);
    const feasibleShift = coerceMelodyStringShiftToFeasible(
      transposedMelody,
      preferredShift,
      deps.state.currentInstrument
    );
    setStoredMelodyStringShift(selectedMelodyId, feasibleShift);
    syncMelodyStringShiftDisplay();
  }

  function hydrateMelodyStudyRangeForSelectedMelody() {
    const selectedMelodyId = getSelectedMelodyId();
    const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
    const totalEvents = melody?.events.length ?? 0;
    const normalized = getStoredMelodyStudyRange(selectedMelodyId, totalEvents);
    deps.state.melodyStudyRangeStartIndex = normalized.startIndex;
    deps.state.melodyStudyRangeEndIndex = normalized.endIndex;
    syncMelodyStudyRangeDisplay(totalEvents);
  }

  function applyMelodyTransposeSemitones(nextValue: unknown) {
    const selectedMelodyId = getSelectedMelodyId();
    const previous = getStoredMelodyTransposeSemitones(selectedMelodyId);
    const next = normalizeMelodyTransposeSemitones(nextValue);
    setStoredMelodyTransposeSemitones(selectedMelodyId, next);
    syncMelodyTransposeDisplay();
    if (next === previous) return false;

    hydrateMelodyStringShiftForSelectedMelody();
    deps.clearPreviewState();
    clearMelodyTransposeCache();
    clearMelodyStringShiftCache();
    deps.renderTimeline();
    return true;
  }

  function applyMelodyStringShift(nextValue: unknown) {
    const selectedMelodyId = getSelectedMelodyId();
    const baseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
    if (!baseMelody || baseMelody.events.length === 0) {
      deps.state.melodyStringShift = 0;
      syncMelodyStringShiftDisplay();
      return { changed: false, valid: false };
    }

    const transposedMelody = getMelodyWithPracticeAdjustments(
      baseMelody,
      deps.state.melodyTransposeSemitones,
      0,
      deps.state.currentInstrument
    );
    const previous = getStoredMelodyStringShift(selectedMelodyId);
    const next = normalizeMelodyStringShift(nextValue, deps.state.currentInstrument);

    if (!isMelodyStringShiftFeasible(transposedMelody, next, deps.state.currentInstrument)) {
      setStoredMelodyStringShift(selectedMelodyId, previous);
      syncMelodyStringShiftDisplay();
      return { changed: false, valid: false };
    }

    setStoredMelodyStringShift(selectedMelodyId, next);
    syncMelodyStringShiftDisplay();
    if (next === previous) return { changed: false, valid: true };

    deps.clearPreviewState();
    clearMelodyStringShiftCache();
    deps.renderTimeline();
    return { changed: true, valid: true };
  }

  function applyMelodyStudyRange(range: Partial<MelodyStudyRange>) {
    const selectedMelodyId = getSelectedMelodyId();
    const melody = selectedMelodyId ? getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
    if (!melody || melody.events.length === 0) {
      syncMelodyStudyRangeDisplay(0);
      return false;
    }

    const previous = getStoredMelodyStudyRange(selectedMelodyId, melody.events.length);
    const next = normalizeMelodyStudyRange(range, melody.events.length);
    setStoredMelodyStudyRange(selectedMelodyId, melody.events.length, next);
    syncMelodyStudyRangeDisplay(melody.events.length);
    if (previous.startIndex === next.startIndex && previous.endIndex === next.endIndex) {
      return false;
    }

    deps.clearPreviewState();
    deps.renderTimeline();
    return true;
  }

  function refreshMelodyOptionsForCurrentInstrument() {
    clearMelodyTransposeCache();
    clearMelodyStringShiftCache();
    const melodies = listMelodiesForInstrument(deps.state.currentInstrument);
    const previousValue = deps.state.preferredMelodyId ?? deps.dom.melodySelector.value;
    deps.dom.melodySelector.innerHTML = '';

    melodies.forEach((melody) => {
      const option = document.createElement('option');
      option.value = melody.id;
      option.textContent = formatMelodySelectorOptionLabel(
        melody,
        getStoredMelodyTransposeSemitones(melody.id)
      );
      deps.dom.melodySelector.append(option);
    });

    const hasPrevious = melodies.some((melody) => melody.id === previousValue);
    if (hasPrevious) {
      deps.dom.melodySelector.value = previousValue;
    } else if (melodies.length > 0) {
      deps.dom.melodySelector.value = melodies[0].id;
    }

    deps.state.preferredMelodyId = deps.dom.melodySelector.value || null;
    hydrateMelodyTransposeForSelectedMelody({ migrateLegacyValue: true });
    hydrateMelodyStringShiftForSelectedMelody();
    hydrateMelodyStudyRangeForSelectedMelody();
    deps.clearPreviewState();
    deps.renderTimeline();
  }

  return {
    getSelectedMelodyId,
    getStoredMelodyTransposeSemitones,
    setStoredMelodyTransposeSemitones,
    getStoredMelodyStudyRange,
    syncMelodyTransposeDisplay,
    syncMelodyStringShiftDisplay,
    syncMelodyStudyRangeDisplay,
    syncMelodyLoopRangeDisplay,
    refreshMelodySelectorOptionLabels,
    hydrateMelodyTransposeForSelectedMelody,
    hydrateMelodyStringShiftForSelectedMelody,
    hydrateMelodyStudyRangeForSelectedMelody,
    applyMelodyTransposeSemitones,
    applyMelodyStringShift,
    applyMelodyStudyRange,
    refreshMelodyOptionsForCurrentInstrument,
  };
}
