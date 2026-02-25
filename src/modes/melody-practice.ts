import { dom, state } from '../state';
import { notifyUserError } from '../user-feedback-port';
import { getMelodyById, type MelodyEvent } from '../melody-library';
import type { ChordNote, Prompt } from '../types';
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

function formatMelodyPromptText(
  eventIndex: number,
  totalEvents: number,
  event: MelodyEvent,
  showNoteHint: boolean
) {
  const stepLabel = `[${eventIndex + 1}/${totalEvents}]`;
  if (!showNoteHint) {
    return `Melody ${stepLabel}: play the next note`;
  }
  return `Melody ${stepLabel}: ${formatMelodyEventHint(event)}`;
}

function toMelodyEventChordNotes(event: MelodyEvent) {
  return [...new Set(event.notes.map((note) => note.note))];
}

function toMelodyEventFingering(event: MelodyEvent): ChordNote[] {
  return event.notes
    .filter(
      (note): note is MelodyEvent['notes'][number] & { stringName: string; fret: number } =>
        note.stringName !== null && typeof note.fret === 'number'
    )
    .map((note) => ({
      note: note.note,
      string: note.stringName,
      fret: note.fret,
    }));
}

export class MelodyPracticeMode implements ITrainingMode {
  detectionType: DetectionType = 'monophonic';

  generatePrompt(): Prompt | null {
    const selectedMelodyId = dom.melodySelector.value;
    if (!selectedMelodyId) {
      if (state.isListening) notifyUserError('Select a melody to practice.');
      return null;
    }

    const melody = getMelodyById(selectedMelodyId, state.currentInstrument);
    if (!melody) {
      if (state.isListening) {
        notifyUserError(
          'Selected melody is not available for the current instrument. Choose another melody or re-import the tab.'
        );
      }
      return null;
    }

    if (state.currentMelodyId !== melody.id) {
      state.currentMelodyId = melody.id;
      state.currentMelodyEventIndex = 0;
      state.currentMelodyEventFoundNotes.clear();
    }

    if (melody.events.length === 0) {
      if (state.isListening) notifyUserError('Selected melody has no playable notes.');
      return null;
    }

    if (state.currentMelodyEventIndex >= melody.events.length) {
      state.pendingSessionStopResultMessage = {
        text: `Melody complete! (${melody.name})`,
        tone: 'success',
      };
      return null;
    }

    const event = melody.events[state.currentMelodyEventIndex];
    const currentEventIndex = state.currentMelodyEventIndex;
    state.currentMelodyEventIndex++;
    state.currentMelodyEventFoundNotes.clear();

    const firstNote = event.notes[0] ?? null;
    const melodyEventFingering = toMelodyEventFingering(event);
    const targetPitchClasses = toMelodyEventChordNotes(event);
    const isPolyphonicEvent = targetPitchClasses.length > 1;
    const firstPlayableNote = melodyEventFingering[0] ?? null;
    const fallbackSingleNoteTarget = firstPlayableNote
      ? { note: firstPlayableNote.note, string: firstPlayableNote.string }
      : firstNote
        ? { note: firstNote.note, string: firstNote.stringName }
        : null;

    return {
      displayText: formatMelodyPromptText(
        currentEventIndex,
        melody.events.length,
        event,
        dom.melodyShowNote.checked
      ),
      // Keep a visual fallback target even for degraded polyphonic imports that have only one playable position.
      targetNote: isPolyphonicEvent
        ? (melodyEventFingering.length <= 1 ? (fallbackSingleNoteTarget?.note ?? null) : null)
        : (fallbackSingleNoteTarget?.note ?? null),
      targetString: isPolyphonicEvent
        ? (melodyEventFingering.length <= 1 ? (fallbackSingleNoteTarget?.string ?? null) : null)
        : (fallbackSingleNoteTarget?.string ?? null),
      targetChordNotes: isPolyphonicEvent ? targetPitchClasses : [],
      targetChordFingering: isPolyphonicEvent ? melodyEventFingering : [],
      targetMelodyEventNotes: melodyEventFingering,
      baseChordName: null,
    };
  }
}
