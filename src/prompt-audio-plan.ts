import type { IInstrument } from './instruments/instrument';
import type { Prompt } from './types';
import { isChordAudioReferenceMode } from './training-mode-groups';
import {
  calculateFrettedFrequencyFromTuning,
  resolvePromptTargetPosition,
} from './prompt-audio';

export interface PromptAudioPlanInput {
  prompt: Prompt | null;
  trainingMode: string;
  instrument: Pick<IInstrument, 'TUNING' | 'FRETBOARD' | 'STRING_ORDER' | 'getNoteWithOctave'>;
  calibratedA4: number;
  enabledStrings: Set<string>;
}

export interface PromptAudioPlan {
  notesToPlay: string[];
  targetFrequency: number | null;
  playSoundEnabled: boolean;
}

const EMPTY_AUDIO_PLAN: PromptAudioPlan = {
  notesToPlay: [],
  targetFrequency: null,
  playSoundEnabled: false,
};

export function buildPromptAudioPlan({
  prompt,
  trainingMode,
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
  };
}
