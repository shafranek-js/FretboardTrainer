import type { IInstrument } from './instruments/instrument';
import type { Prompt } from './types';
import { isChordAudioReferenceMode, isMelodyWorkflowMode } from './training-mode-groups';
import {
  calculateFrettedFrequencyFromTuning,
  resolvePromptTargetPosition,
} from './prompt-audio';

export interface PromptAudioPlanInput {
  prompt: Prompt | null;
  trainingMode: string;
  autoPlayPromptSoundEnabled?: boolean;
  instrument: Pick<IInstrument, 'TUNING' | 'FRETBOARD' | 'STRING_ORDER' | 'getNoteWithOctave'>;
  calibratedA4: number;
  enabledStrings: Set<string>;
}

export interface PromptAudioPlan {
  notesToPlay: string[];
  targetFrequency: number | null;
  playSoundEnabled: boolean;
  autoPlaySound: boolean;
}

const EMPTY_AUDIO_PLAN: PromptAudioPlan = {
  notesToPlay: [],
  targetFrequency: null,
  playSoundEnabled: false,
  autoPlaySound: false,
};

export function buildPromptAudioPlan({
  prompt,
  trainingMode,
  autoPlayPromptSoundEnabled = true,
  instrument,
  calibratedA4,
  enabledStrings,
}: PromptAudioPlanInput): PromptAudioPlan {
  if (!prompt) {
    return EMPTY_AUDIO_PLAN;
  }

  if (isChordAudioReferenceMode(trainingMode)) {
    const notesToPlay = prompt.targetChordFingering
      .map((noteInfo) => instrument.getNoteWithOctave(noteInfo.string, noteInfo.fret))
      .filter((note): note is string => note !== null);

    return {
      notesToPlay,
      targetFrequency: null,
      playSoundEnabled: true,
      autoPlaySound: autoPlayPromptSoundEnabled,
    };
  }

  if (isMelodyWorkflowMode(trainingMode) && (prompt.targetMelodyEventNotes?.length ?? 0) > 0) {
    const melodyNotes = prompt.targetMelodyEventNotes ?? [];
    const notesToPlay = melodyNotes
      .map((noteInfo) => instrument.getNoteWithOctave(noteInfo.string, noteInfo.fret))
      .filter((note): note is string => note !== null);
    let targetFrequency: number | null = null;
    if (melodyNotes.length === 1) {
      const singleNote = melodyNotes[0];
      const openStringTuning = instrument.TUNING[singleNote.string];
      targetFrequency = calculateFrettedFrequencyFromTuning(
        openStringTuning,
        singleNote.fret,
        calibratedA4
      );
    }

    return {
      notesToPlay,
      targetFrequency,
      playSoundEnabled: notesToPlay.length > 0,
      autoPlaySound: false,
    };
  }

  if (!prompt.targetNote) {
    return EMPTY_AUDIO_PLAN;
  }

  const resolvedTarget = resolvePromptTargetPosition({
    targetNote: prompt.targetNote,
    preferredString: prompt.targetString,
    enabledStrings,
    instrument,
  });

  if (!resolvedTarget) {
    return EMPTY_AUDIO_PLAN;
  }

  const { stringName, fret } = resolvedTarget;
  const noteWithOctave = instrument.getNoteWithOctave(stringName, fret);
  const openStringTuning = instrument.TUNING[stringName];
  const targetFrequency = calculateFrettedFrequencyFromTuning(openStringTuning, fret, calibratedA4);

  return {
    notesToPlay: noteWithOctave ? [noteWithOctave] : [],
    targetFrequency,
    playSoundEnabled: Boolean(noteWithOctave && targetFrequency !== null),
    autoPlaySound: autoPlayPromptSoundEnabled && !isMelodyWorkflowMode(trainingMode),
  };
}
