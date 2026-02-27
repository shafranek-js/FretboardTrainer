import type { MelodyEvent } from './melody-library';
import type { ChordNote } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toPlayableEventNotes(event: MelodyEvent): ChordNote[] {
  return event.notes
    .filter(
      (note): note is MelodyEvent['notes'][number] & { stringName: string; fret: number } =>
        note.stringName !== null && typeof note.fret === 'number'
    )
    .map((note) => ({
      note: note.note,
      string: note.stringName,
      fret: note.fret,
    }));
}

function resolveEventHandPosition(currentHandPosition: number | null, positiveFrets: number[]) {
  if (positiveFrets.length === 0) return currentHandPosition;

  const sorted = [...positiveFrets].sort((a, b) => a - b);
  const minFret = sorted[0];
  const maxFret = sorted[sorted.length - 1];
  const previous = currentHandPosition ?? Math.max(1, minFret);

  // Reach window where a 1-finger-per-fret hand position can still cover event notes.
  const lowerBound = Math.max(1, maxFret - 3);
  const upperBound = minFret;
  if (lowerBound <= upperBound) {
    return clamp(previous, lowerBound, upperBound);
  }

  // Event span is wider than 4 frets: keep the hand near previous position.
  return clamp(previous, upperBound, lowerBound);
}

export function buildMelodyFingeredEvents(events: MelodyEvent[]): ChordNote[][] {
  let handPosition: number | null = null;

  return events.map((event) => {
    const playable = toPlayableEventNotes(event);
    const positiveFrets = playable.map((note) => note.fret).filter((fret) => fret > 0);
    handPosition = resolveEventHandPosition(handPosition, positiveFrets);

    return playable.map((note) => {
      if (note.fret <= 0) {
        return { ...note, finger: 0 };
      }
      const finger =
        handPosition === null ? 1 : clamp(note.fret - handPosition + 1, 1, 4);
      return { ...note, finger };
    });
  });
}

export function getMelodyFingeredEvent(events: MelodyEvent[], eventIndex: number): ChordNote[] {
  if (eventIndex < 0 || eventIndex >= events.length) return [];
  return buildMelodyFingeredEvents(events)[eventIndex] ?? [];
}
