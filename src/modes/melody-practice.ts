import { dom } from '../dom';
import { state } from '../state';
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

function formatMelodyPromptText(melodyName: string) {
  return `Melody: ${melodyName}`;
}

function toMelodyEventChordNotes(event: MelodyEvent) {
  return [...new Set(event.notes.map((note) => note.note))];
}

function getMelodyStudyBpm(melody: { id: string; sourceTempoBpm?: number | null }) {
  return resolveMelodyPlaybackTempoBpm(melody, state.melodyPlaybackBpmById, melody.sourceTempoBpm ?? 90);
}

export class MelodyPracticeMode implements ITrainingMode {
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
    }

    if (state.currentMelodyEventIndex < studyRange.startIndex) {
      state.currentMelodyEventIndex = studyRange.startIndex;
    }

    if (state.currentMelodyEventIndex > studyRange.endIndex) {
      const completionText = isDefaultMelodyStudyRange(studyRange, melody.events.length)
        ? `Melody complete! (${melody.name})`
        : `Study range complete! (${melody.name}, ${formatMelodyStudyRange(studyRange, melody.events.length)})`;
      state.pendingSessionStopResultMessage = {
        text: completionText,
        tone: 'success',
      };
      return null;
    }

    const currentEventIndex = state.currentMelodyEventIndex;
    const event = melody.events[currentEventIndex];
    const bpm = getMelodyStudyBpm(melody);

    const firstNote = event.notes[0] ?? null;
    const fingeredEvent = getMelodyFingeredEvent(melody.events, currentEventIndex, {
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
      displayText: formatMelodyPromptText(melody.name),
      targetNote: isPolyphonicEvent
        ? (melodyEventFingering.length <= 1 ? (fallbackSingleNoteTarget?.note ?? null) : null)
        : (fallbackSingleNoteTarget?.note ?? null),
      targetString: isPolyphonicEvent
        ? (melodyEventFingering.length <= 1 ? (fallbackSingleNoteTarget?.string ?? null) : null)
        : (fallbackSingleNoteTarget?.string ?? null),
      targetChordNotes: isPolyphonicEvent ? targetPitchClasses : [],
      targetChordFingering: isPolyphonicEvent ? melodyEventFingering : [],
      targetMelodyEventNotes: melodyEventFingering,
      melodyEventDurationMs: getMelodyEventPlaybackDurationMs(event, bpm, melody),
      baseChordName: null,
    };
  }
}


