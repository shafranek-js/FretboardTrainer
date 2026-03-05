import type { MelodyEvent } from './melody-library';
import type { ChordNote } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeFingerOverride(finger: number | null | undefined) {
  if (typeof finger !== 'number' || !Number.isFinite(finger)) return null;
  return clamp(Math.round(finger), 0, 4);
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
      finger: normalizeFingerOverride(note.finger) ?? undefined,
    }));
}

function resolveLowestFutureFret(
  positiveFretsByEvent: number[][],
  eventIndex: number,
  lookAheadWindow: number
) {
  let lowest: number | null = null;
  const lastIndex = Math.min(positiveFretsByEvent.length - 1, eventIndex + lookAheadWindow);
  for (let index = eventIndex + 1; index <= lastIndex; index += 1) {
    const frets = positiveFretsByEvent[index] ?? [];
    if (frets.length === 0) continue;
    const eventMinFret = Math.min(...frets);
    lowest = lowest === null ? eventMinFret : Math.min(lowest, eventMinFret);
  }
  return lowest;
}

function getSingleNoteFingerPenalty(singleNoteFret: number, handPosition: number) {
  const assignedFinger = clamp(singleNoteFret - handPosition + 1, 1, 4);
  if (assignedFinger === 2) return 0;
  if (assignedFinger === 1 || assignedFinger === 4) return 0.45;
  return 0.35;
}

function resolveEventHandPosition(
  currentHandPosition: number | null,
  positiveFrets: number[],
  lowestFutureFret: number | null
) {
  if (positiveFrets.length === 0) return currentHandPosition;

  const sorted = [...positiveFrets].sort((a, b) => a - b);
  const minFret = sorted[0];
  const maxFret = sorted[sorted.length - 1];
  const previous = currentHandPosition ?? Math.max(1, minFret);

  // Reach window where a 1-finger-per-fret hand position can still cover event notes.
  const lowerBound = Math.max(1, maxFret - 3);
  const upperBound = minFret;
  if (lowerBound <= upperBound) {
    const base = clamp(previous, lowerBound, upperBound);
    if (lowestFutureFret === null || lowestFutureFret >= minFret) {
      return base;
    }

    let best = base;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let candidate = lowerBound; candidate <= upperBound; candidate += 1) {
      const movementCost = Math.abs(candidate - previous);
      const futurePrepCost = Math.abs(candidate - lowestFutureFret) * 1.3;
      const singleNotePenalty =
        positiveFrets.length === 1 ? getSingleNoteFingerPenalty(minFret, candidate) : 0;
      const score = movementCost + futurePrepCost + singleNotePenalty;
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = candidate;
      }
    }
    return best;
  }

  // Event span is wider than 4 frets: keep the hand near previous position.
  return clamp(previous, upperBound, lowerBound);
}

export function buildMelodyFingeredEvents(events: MelodyEvent[]): ChordNote[][] {
  let handPosition: number | null = null;
  const playableEvents = events.map((event) => toPlayableEventNotes(event));
  const positiveFretsByEvent = playableEvents.map((playable) =>
    playable.map((note) => note.fret).filter((fret) => fret > 0)
  );

  return playableEvents.map((playable, eventIndex) => {
    const positiveFrets = positiveFretsByEvent[eventIndex] ?? [];
    const lowestFutureFret = resolveLowestFutureFret(positiveFretsByEvent, eventIndex, 4);
    handPosition = resolveEventHandPosition(handPosition, positiveFrets, lowestFutureFret);

    return playable.map((note) => {
      if (typeof note.finger === 'number') {
        return { ...note, finger: note.finger };
      }
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
