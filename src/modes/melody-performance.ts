import { dom, state } from '../state';
import { getMelodyById, type MelodyEvent } from '../melody-library';
import { getMelodyFingeredEvent } from '../melody-fingering';
import { getPlayableMelodyEventNotes } from '../melody-playable-event-notes';
import { resolveMelodyPlaybackTempoBpm } from '../melody-playback-tempo';
import {
  formatMelodyStudyRange,
  isDefaultMelodyStudyRange,
  normalizeMelodyStudyRange,
} from '../melody-study-range';
import { getMelodyWithPracticeAdjustments } from '../melody-string-shift';
import { getMelodyEventPlaybackDurationMs } from '../melody-timeline-duration';
import type { Prompt } from '../types';
import { ITrainingMode, DetectionType } from './training-mode';

function formatPerformancePromptText(melodyName: string) {
  return `${dom.trainingMode.value === 'practice' ? 'Practice' : 'Performance'}: ${melodyName}`;
}

function toMelodyEventChordNotes(event: MelodyEvent) {
  return [...new Set(event.notes.map((note) => note.note))];
}

function getPerformanceBpm(melody: { id: string; sourceTempoBpm?: number | null }) {
  return resolveMelodyPlaybackTempoBpm(melody, state.melodyPlaybackBpmById, melody.sourceTempoBpm ?? 90);
}

export function buildPerformancePromptForEvent(input: {
  melody: ReturnType<typeof getMelodyWithPracticeAdjustments>;
  studyRange: { startIndex: number; endIndex: number };
  eventIndex: number;
  bpm: number;
}): Prompt | null {
  const { melody, studyRange, eventIndex, bpm } = input;
  if (eventIndex < studyRange.startIndex || eventIndex > studyRange.endIndex) {
    return null;
  }

  const event = melody.events[eventIndex];
  if (!event) return null;
  const firstNote = event.notes[0] ?? null;
  const fingeredEvent = getMelodyFingeredEvent(melody.events, eventIndex, {
    strategy: state.melodyFingeringStrategy,
    level: state.melodyFingeringLevel,
  });
  const melodyEventFingering = getPlayableMelodyEventNotes(event, fingeredEvent);
  const targetPitchClasses = toMelodyEventChordNotes(event);
  const isPolyphonicEvent = targetPitchClasses.length > 1;
  const firstPlayableNote = melodyEventFingering[0] ?? null;
  const fallbackSingleNoteTarget = firstPlayableNote
    ? { note: firstPlayableNote.note, string: firstPlayableNote.string }
    : firstNote
      ? { note: firstNote.note, string: firstNote.stringName }
      : null;

  return {
    displayText: formatPerformancePromptText(melody.name),
    targetNote: isPolyphonicEvent
      ? melodyEventFingering.length <= 1
        ? (fallbackSingleNoteTarget?.note ?? null)
        : null
      : (fallbackSingleNoteTarget?.note ?? null),
    targetString: isPolyphonicEvent
      ? melodyEventFingering.length <= 1
        ? (fallbackSingleNoteTarget?.string ?? null)
        : null
      : (fallbackSingleNoteTarget?.string ?? null),
    targetChordNotes: isPolyphonicEvent ? targetPitchClasses : [],
    targetChordFingering: isPolyphonicEvent ? melodyEventFingering : [],
    targetMelodyEventNotes: melodyEventFingering,
    melodyEventDurationMs: getMelodyEventPlaybackDurationMs(event, bpm, melody),
    baseChordName: null,
  };
}

export class MelodyPerformanceMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    const selectedMelodyId = dom.melodySelector.value;
    if (!selectedMelodyId) return null;

    const baseMelody = getMelodyById(selectedMelodyId, state.currentInstrument);
    if (!baseMelody) return null;

    const melody = getMelodyWithPracticeAdjustments(
      baseMelody,
      state.melodyTransposeSemitones,
      state.melodyStringShift,
      state.currentInstrument
    );
    if (melody.events.length === 0) return null;

    const studyRange = normalizeMelodyStudyRange(state.melodyStudyRangeById?.[melody.id], melody.events.length);
    if (state.currentMelodyId !== melody.id) {
      state.currentMelodyId = melody.id;
      state.currentMelodyEventIndex = studyRange.startIndex;
      state.performanceActiveEventIndex = studyRange.startIndex;
    }

    if (state.currentMelodyEventIndex < studyRange.startIndex) {
      state.currentMelodyEventIndex = studyRange.startIndex;
    }

    if (state.currentMelodyEventIndex > studyRange.endIndex) {
      const completionPrefix = dom.trainingMode.value === 'practice' ? 'Practice loop complete' : 'Performance complete';
      const rangeCompletionPrefix =
        dom.trainingMode.value === 'practice' ? 'Practice range complete' : 'Performance range complete';
      const completionText = isDefaultMelodyStudyRange(studyRange, melody.events.length)
        ? `${completionPrefix}! (${melody.name})`
        : `${rangeCompletionPrefix}! (${melody.name}, ${formatMelodyStudyRange(studyRange, melody.events.length)})`;
      state.pendingSessionStopResultMessage = {
        text: completionText,
        tone: 'success',
      };
      return null;
    }

    state.performanceActiveEventIndex = state.currentMelodyEventIndex;

    return buildPerformancePromptForEvent({
      melody,
      studyRange,
      eventIndex: state.currentMelodyEventIndex,
      bpm: getPerformanceBpm(melody),
    });
  }
}


