import type { Prompt } from './types';
import { toPitchClass } from './pitch-class';

export function getMelodyPromptPitchClasses(prompt: Prompt | null | undefined) {
  if (!prompt) return [] as string[];
  if (prompt.targetChordNotes.length > 0) {
    return [
      ...new Set(
        prompt.targetChordNotes
          .map((note) => toPitchClass(note))
          .filter((note): note is string => typeof note === 'string' && note.length > 0)
      ),
    ];
  }
  return [
    ...new Set(
      (prompt.targetMelodyEventNotes ?? [])
        .map((note) => toPitchClass(note.note))
        .filter((note): note is string => typeof note === 'string' && note.length > 0)
    ),
  ];
}

export function isPolyphonicMelodyPrompt(prompt: Prompt | null | undefined) {
  return getMelodyPromptPitchClasses(prompt).length > 1;
}
