import type { MidiNoteEvent } from './midi-runtime';
import type { DetectionType } from './modes/training-mode';

export interface MidiSessionMessageHandlerDeps {
  canProcessEvent: () => boolean;
  getCurrentModeDetectionType: () => DetectionType | null;
  getTrainingModeValue: () => string;
  handleMelodyUpdate: (event: MidiNoteEvent) => void;
  handlePolyphonicUpdate: (event: MidiNoteEvent) => void;
  clearLiveDetectedHighlight: () => void;
  handleStableMonophonicDetectedNote: (detectedNote: string) => void;
  onRuntimeError: (context: string, error: unknown) => void;
}

export function createMidiSessionMessageHandler(deps: MidiSessionMessageHandlerDeps) {
  return (event: MidiNoteEvent) => {
    try {
      if (!deps.canProcessEvent()) return;

      const detectionType = deps.getCurrentModeDetectionType();
      if (!detectionType) return;

      if (deps.getTrainingModeValue() === 'melody') {
        deps.handleMelodyUpdate(event);
        return;
      }

      if (detectionType === 'polyphonic') {
        deps.handlePolyphonicUpdate(event);
        return;
      }

      if (event.kind === 'noteoff') {
        if (deps.getTrainingModeValue() === 'free' && event.heldNoteNames.length === 0) {
          deps.clearLiveDetectedHighlight();
        }
        return;
      }

      deps.handleStableMonophonicDetectedNote(event.noteName);
    } catch (error) {
      deps.onRuntimeError('midi input message', error);
    }
  };
}
