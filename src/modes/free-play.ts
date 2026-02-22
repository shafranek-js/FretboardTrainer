import type { ITrainingMode } from './training-mode';
import type { Prompt } from '../types';

export class FreePlayMode implements ITrainingMode {
  detectionType = 'monophonic' as const;

  generatePrompt(): Prompt {
    return {
      displayText: 'Free Play: play any note',
      targetNote: null,
      targetString: null,
      targetChordNotes: [],
      targetChordFingering: [],
      baseChordName: null,
    };
  }
}
