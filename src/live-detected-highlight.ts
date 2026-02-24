import type { IInstrument } from './instruments/instrument';
import { resolvePromptTargetPosition } from './prompt-audio';

export interface LiveDetectedHighlightStateRef {
  liveDetectedNote: string | null;
  liveDetectedString: string | null;
}

export interface UpdateLiveDetectedHighlightInput {
  note: string;
  stateRef: LiveDetectedHighlightStateRef;
  enabledStrings: Set<string>;
  instrument: Pick<IInstrument, 'FRETBOARD' | 'STRING_ORDER'>;
  redraw: () => void;
}

export function clearLiveDetectedHighlight(stateRef: LiveDetectedHighlightStateRef, redraw: () => void) {
  if (stateRef.liveDetectedNote === null && stateRef.liveDetectedString === null) return;
  stateRef.liveDetectedNote = null;
  stateRef.liveDetectedString = null;
  redraw();
}

export function updateLiveDetectedHighlight({
  note,
  stateRef,
  enabledStrings,
  instrument,
  redraw,
}: UpdateLiveDetectedHighlightInput) {
  const resolved = resolvePromptTargetPosition({
    targetNote: note,
    preferredString: null,
    enabledStrings,
    instrument,
  });

  const nextString = resolved?.stringName ?? null;
  if (stateRef.liveDetectedNote === note && stateRef.liveDetectedString === nextString) return;

  stateRef.liveDetectedNote = note;
  stateRef.liveDetectedString = nextString;
  redraw();
}
