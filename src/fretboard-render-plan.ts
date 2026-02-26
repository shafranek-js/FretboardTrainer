import type { ChordNote, Prompt } from './types';
import { isArpeggioMode, isChordDataMode } from './training-mode-groups';

export interface FretboardRenderInputs {
  trainingMode: string;
  isListening: boolean;
  showingAllNotes: boolean;
  currentPrompt: Prompt | null;
  currentArpeggioIndex: number;
  liveDetectedNote?: string | null;
  liveDetectedString?: string | null;
  melodyFoundNotes?: Set<string>;
}

export interface FretboardRenderPlan {
  showAll: boolean;
  rootNote: string | null;
  rootString: string | null;
  chordFingering: ChordNote[];
  foundChordNotes: Set<string>;
  currentTargetNote: string | null;
}

/** Derives a renderer-agnostic fretboard view model from app state. */
export function computeFretboardRenderPlan(inputs: FretboardRenderInputs): FretboardRenderPlan {
  const { trainingMode, isListening, showingAllNotes, currentPrompt, currentArpeggioIndex } =
    inputs;
  const liveDetectedNote = inputs.liveDetectedNote ?? null;
  const melodyFoundNotes = inputs.melodyFoundNotes ?? new Set<string>();

  const isChordBasedMode = isChordDataMode(trainingMode);

  if (isChordBasedMode && isListening && currentPrompt) {
    const chordFingering = currentPrompt.targetChordFingering || [];

    if (isArpeggioMode(trainingMode)) {
      const arpeggioNotes = currentPrompt.targetChordNotes || [];
      return {
        showAll: false,
        rootNote: null,
        rootString: null,
        chordFingering,
        foundChordNotes: new Set(arpeggioNotes.slice(0, currentArpeggioIndex)),
        currentTargetNote: arpeggioNotes[currentArpeggioIndex] ?? null,
      };
    }

    return {
      showAll: false,
      rootNote: null,
      rootString: null,
      chordFingering,
      foundChordNotes: new Set(),
      currentTargetNote: null,
    };
  }

  if (trainingMode === 'free' && isListening && liveDetectedNote) {
    return {
      showAll: false,
      rootNote: liveDetectedNote,
      rootString: null,
      chordFingering: [],
      foundChordNotes: new Set(),
      currentTargetNote: null,
    };
  }

  if (trainingMode === 'melody' && isListening && currentPrompt) {
    const melodyEventFingering = currentPrompt.targetMelodyEventNotes ?? [];
    if (melodyEventFingering.length >= 1) {
      return {
        showAll: false,
        rootNote: null,
        rootString: null,
        chordFingering: melodyEventFingering,
        foundChordNotes: new Set(melodyFoundNotes),
        currentTargetNote: melodyEventFingering.length === 1 ? currentPrompt.targetNote : null,
      };
    }

    if (!currentPrompt.targetNote) {
      return {
        showAll: false,
        rootNote: null,
        rootString: null,
        chordFingering: [],
        foundChordNotes: new Set(),
        currentTargetNote: null,
      };
    }

    return {
      showAll: false,
      rootNote: currentPrompt.targetNote,
      rootString: currentPrompt.targetString,
      chordFingering: [],
      foundChordNotes: new Set(),
      currentTargetNote: null,
    };
  }

  if (showingAllNotes) {
    return {
      showAll: true,
      rootNote: null,
      rootString: null,
      chordFingering: [],
      foundChordNotes: new Set(),
      currentTargetNote: null,
    };
  }

  return {
    showAll: false,
    rootNote: null,
    rootString: null,
    chordFingering: [],
    foundChordNotes: new Set(),
    currentTargetNote: null,
  };
}
