import type { IInstrument } from './instruments/instrument';
import { getMelodyById } from './melody-library';
import { normalizeMelodyStudyRange } from './melody-study-range';
import { getMelodyWithPracticeAdjustments } from './melody-string-shift';
import { isPerformanceStyleMode } from './training-mode-groups';

export interface SessionInitialTimelinePreviewInput {
  trainingMode: string;
  selectedMelodyId: string;
  currentInstrument: IInstrument;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
  melodyStudyRangeStartIndex: number;
  melodyStudyRangeEndIndex: number;
}

export interface SessionInitialTimelinePreview {
  eventIndex: number;
}

export function buildSessionInitialTimelinePreview(
  input: SessionInitialTimelinePreviewInput
): SessionInitialTimelinePreview | null {
  if (!isPerformanceStyleMode(input.trainingMode) || !input.selectedMelodyId) {
    return null;
  }

  const baseMelody = getMelodyById(input.selectedMelodyId, input.currentInstrument);
  if (!baseMelody) {
    return null;
  }

  const melody = getMelodyWithPracticeAdjustments(
    baseMelody,
    input.melodyTransposeSemitones,
    input.melodyStringShift,
    input.currentInstrument
  );
  if (melody.events.length === 0) {
    return null;
  }

  const studyRange = normalizeMelodyStudyRange(
    {
      startIndex: input.melodyStudyRangeStartIndex,
      endIndex: input.melodyStudyRangeEndIndex,
    },
    melody.events.length
  );

  return {
    eventIndex: studyRange.startIndex,
  };
}
