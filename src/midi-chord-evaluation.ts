function uniqueSortedNotes(notes: Iterable<string>) {
  return [...new Set(notes)].sort();
}

export function formatDetectedMidiChordNotes(notes: Iterable<string>) {
  return uniqueSortedNotes(notes).join(',') || '...';
}

export function areMidiHeldNotesMatchingTargetChord(
  heldNoteNames: string[],
  targetChordNotes: string[]
) {
  const target = uniqueSortedNotes(targetChordNotes);
  const held = uniqueSortedNotes(heldNoteNames);
  if (target.length === 0) return false;
  if (held.length !== target.length) return false;
  return held.every((note, index) => note === target[index]);
}
