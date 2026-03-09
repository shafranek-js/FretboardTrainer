export type ChordNoteLike = { note: string; string?: string | null; fret?: number | null };

type PromptLike = {
  targetNote: string | null;
  targetString: string | null;
  targetMelodyEventNotes?: ChordNoteLike[];
};

function normalizeEventNote(note: ChordNoteLike) {
  return `${note.note}|${note.string ?? ''}|${typeof note.fret === 'number' ? note.fret : ''}`;
}

function haveSameMelodyEventNotes(previousPrompt: PromptLike, nextPrompt: PromptLike) {
  const previousNotes = previousPrompt.targetMelodyEventNotes ?? [];
  const nextNotes = nextPrompt.targetMelodyEventNotes ?? [];
  if (previousNotes.length === 0 || nextNotes.length === 0) return false;
  if (previousNotes.length !== nextNotes.length) return false;
  return previousNotes.every((note, index) => normalizeEventNote(note) === normalizeEventNote(nextNotes[index]));
}

export function shouldResetStudyMelodyOnsetTrackingOnPromptChange(
  trainingMode: string,
  previousPrompt: PromptLike | null,
  nextPrompt: PromptLike
) {
  if (trainingMode !== 'melody' || !previousPrompt) return false;
  if (haveSameMelodyEventNotes(previousPrompt, nextPrompt)) return true;
  return (
    previousPrompt.targetNote !== null &&
    previousPrompt.targetNote === nextPrompt.targetNote &&
    previousPrompt.targetString === nextPrompt.targetString
  );
}
