import { dom, state } from '../state';
import { notifyUserError } from '../user-feedback-port';
import { getMelodyById, type MelodyEvent } from '../melody-library';
import { getMelodyFingeredEvent } from '../melody-fingering';
import {
  formatMelodyStudyRange,
  formatMelodyStudyStepLabel,
  isDefaultMelodyStudyRange,
  normalizeMelodyStudyRange,
} from '../melody-study-range';
import { getMelodyWithPracticeAdjustments } from '../melody-string-shift';
import { clampMelodyPlaybackBpm, getMelodyEventPlaybackDurationMs } from '../melody-timeline-duration';
import type { Prompt } from '../types';
import { ITrainingMode, DetectionType } from './training-mode';

function formatMelodyEventHint(event: MelodyEvent) {
  return event.notes
    .map((note) => {
      if (note.stringName !== null && typeof note.fret === 'number') {
        return `${note.note} (${note.stringName}, fret ${note.fret})`;
      }
      return note.note;
    })
    .join(' + ');
}

function formatPerformancePromptText(stepLabel: string, event: MelodyEvent, showNoteHint: boolean) {
  if (!showNoteHint) {
    return `Performance ${stepLabel}: keep the run going`;
  }
  return `Performance ${stepLabel}: ${formatMelodyEventHint(event)}`;
}

function toMelodyEventChordNotes(event: MelodyEvent) {
  return [...new Set(event.notes.map((note) => note.note))];
}

function getPerformanceBpmFromUi() {
  return clampMelodyPlaybackBpm(Number.parseInt(dom.melodyDemoBpm.value, 10));
}

export class MelodyPerformanceMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    const selectedMelodyId = dom.melodySelector.value;
    if (!selectedMelodyId) {
      if (state.isListening) notifyUserError('Select a melody to perform.');
      return null;
    }

    const baseMelody = getMelodyById(selectedMelodyId, state.currentInstrument);
    if (!baseMelody) {
      if (state.isListening) {
        notifyUserError(
          'Selected melody is not available for the current instrument. Choose another melody or re-import the tab.'
        );
      }
      return null;
    }

    const melody = getMelodyWithPracticeAdjustments(
      baseMelody,
      state.melodyTransposeSemitones,
      state.melodyStringShift,
      state.currentInstrument
    );

    if (melody.events.length === 0) {
      if (state.isListening) notifyUserError('Selected melody has no playable notes.');
      return null;
    }

    const studyRange = normalizeMelodyStudyRange(state.melodyStudyRangeById?.[melody.id], melody.events.length);
    const totalEventsInRange = studyRange.endIndex - studyRange.startIndex + 1;

    if (state.currentMelodyId !== melody.id) {
      state.currentMelodyId = melody.id;
      state.currentMelodyEventIndex = studyRange.startIndex;
      state.currentMelodyEventFoundNotes.clear();
    }

    if (state.currentMelodyEventIndex < studyRange.startIndex) {
      state.currentMelodyEventIndex = studyRange.startIndex;
    }

    if (state.currentMelodyEventIndex > studyRange.endIndex) {
      const completionText = isDefaultMelodyStudyRange(studyRange, melody.events.length)
        ? `Performance complete! (${melody.name})`
        : `Performance range complete! (${melody.name}, ${formatMelodyStudyRange(studyRange, melody.events.length)})`;
      state.pendingSessionStopResultMessage = {
        text: completionText,
        tone: 'success',
      };
      return null;
    }

    const event = melody.events[state.currentMelodyEventIndex];
    const currentEventIndex = state.currentMelodyEventIndex;
    const currentEventIndexInRange = currentEventIndex - studyRange.startIndex;
    state.currentMelodyEventIndex++;
    state.currentMelodyEventFoundNotes.clear();

    const firstNote = event.notes[0] ?? null;
    const melodyEventFingering = getMelodyFingeredEvent(melody.events, currentEventIndex);
    const targetPitchClasses = toMelodyEventChordNotes(event);
    const isPolyphonicEvent = targetPitchClasses.length > 1;
    const firstPlayableNote = melodyEventFingering[0] ?? null;
    const fallbackSingleNoteTarget = firstPlayableNote
      ? { note: firstPlayableNote.note, string: firstPlayableNote.string }
      : firstNote
        ? { note: firstNote.note, string: firstNote.stringName }
        : null;

    return {
      displayText: formatPerformancePromptText(
        formatMelodyStudyStepLabel(
          currentEventIndexInRange,
          totalEventsInRange,
          studyRange,
          melody.events.length
        ),
        event,
        dom.melodyShowNote.checked
      ),
      targetNote: isPolyphonicEvent
        ? (melodyEventFingering.length <= 1 ? (fallbackSingleNoteTarget?.note ?? null) : null)
        : (fallbackSingleNoteTarget?.note ?? null),
      targetString: isPolyphonicEvent
        ? (melodyEventFingering.length <= 1 ? (fallbackSingleNoteTarget?.string ?? null) : null)
        : (fallbackSingleNoteTarget?.string ?? null),
      targetChordNotes: isPolyphonicEvent ? targetPitchClasses : [],
      targetChordFingering: isPolyphonicEvent ? melodyEventFingering : [],
      targetMelodyEventNotes: melodyEventFingering,
      melodyEventDurationMs: getMelodyEventPlaybackDurationMs(event, getPerformanceBpmFromUi()),
      baseChordName: null,
    };
  }
}
