import type { MelodyEvent } from './melody-library';
import type { ChordNote } from './types';

function isPositionedNote(
  note: Partial<ChordNote> | MelodyEvent['notes'][number] | null | undefined
): note is { note: string; string?: string; stringName?: string; fret: number; finger?: number } {
  if (!note || typeof note.note !== 'string') return false;
  const stringName =
    'string' in note && typeof note.string === 'string'
      ? note.string
      : 'stringName' in note && typeof note.stringName === 'string'
        ? note.stringName
        : null;
  return typeof stringName === 'string' && typeof note.fret === 'number' && Number.isFinite(note.fret);
}

function toPlayableNote(
  note: { note: string; string?: string; stringName?: string; fret: number; finger?: number }
): ChordNote {
  return {
    note: note.note,
    string: note.string ?? note.stringName!,
    fret: note.fret,
    finger: typeof note.finger === 'number' ? note.finger : undefined,
  };
}

export function getPlayableMelodyEventNotes(
  event: MelodyEvent | null | undefined,
  fingeredEvent: ChordNote[] | null | undefined
): ChordNote[] {
  const merged = new Map<string, ChordNote>();

  (fingeredEvent ?? []).forEach((note) => {
    if (!isPositionedNote(note)) return;
    const playable = toPlayableNote(note);
    merged.set(`${playable.string}:${playable.fret}:${playable.note}`, playable);
  });

  (event?.notes ?? []).forEach((note) => {
    if (!isPositionedNote(note)) return;
    const playable = toPlayableNote(note);
    const key = `${playable.string}:${playable.fret}:${playable.note}`;
    if (!merged.has(key)) {
      merged.set(key, playable);
    }
  });

  return [...merged.values()];
}
