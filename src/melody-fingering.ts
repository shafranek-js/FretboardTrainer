import type { MelodyEvent } from './melody-library';
import type { ChordNote } from './types';

export type MelodyFingeringStrategy = 'heuristic' | 'minimax';
export type MelodyFingeringLevel = 'beginner' | 'intermediate' | 'advanced';

export interface MelodyFingeringOptions {
  strategy?: MelodyFingeringStrategy;
  level?: MelodyFingeringLevel;
}

export function normalizeMelodyFingeringStrategy(value: unknown): MelodyFingeringStrategy {
  return value === 'heuristic' ? 'heuristic' : 'minimax';
}

export function normalizeMelodyFingeringLevel(value: unknown): MelodyFingeringLevel {
  if (value === 'intermediate') return 'intermediate';
  if (value === 'advanced') return 'advanced';
  return 'beginner';
}

interface MinimaxLevelTuning {
  lowPositionBiasWeight: number;
  spanCostWeight: number;
  singleNotePenaltyScale: number;
  longShiftExtraWeight: number;
  veryShortDurationMultiplier: number;
  shortDurationMultiplier: number;
}

const MINIMAX_LEVEL_TUNING: Record<MelodyFingeringLevel, MinimaxLevelTuning> = {
  beginner: {
    lowPositionBiasWeight: 0.09,
    spanCostWeight: 0.11,
    singleNotePenaltyScale: 1.2,
    longShiftExtraWeight: 1.15,
    veryShortDurationMultiplier: 1.45,
    shortDurationMultiplier: 1.28,
  },
  intermediate: {
    lowPositionBiasWeight: 0.06,
    spanCostWeight: 0.08,
    singleNotePenaltyScale: 1.0,
    longShiftExtraWeight: 0.85,
    veryShortDurationMultiplier: 1.35,
    shortDurationMultiplier: 1.2,
  },
  advanced: {
    lowPositionBiasWeight: 0.03,
    spanCostWeight: 0.05,
    singleNotePenaltyScale: 0.8,
    longShiftExtraWeight: 0.55,
    veryShortDurationMultiplier: 1.22,
    shortDurationMultiplier: 1.1,
  },
};

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

function resolveNearestFutureFret(
  positiveFretsByEvent: number[][],
  eventIndex: number,
  lookAheadWindow: number
) {
  const lastIndex = Math.min(positiveFretsByEvent.length - 1, eventIndex + lookAheadWindow);
  for (let index = eventIndex + 1; index <= lastIndex; index += 1) {
    const frets = positiveFretsByEvent[index] ?? [];
    if (frets.length === 0) continue;
    return Math.min(...frets);
  }
  return null;
}

function getSingleNoteFingerPenalty(
  singleNoteFret: number,
  handPosition: number,
  futureDirection: 'up' | 'down' | 'steady'
) {
  const assignedFinger = clamp(singleNoteFret - handPosition + 1, 1, 4);
  if (futureDirection === 'up') {
    if (assignedFinger === 1) return -0.35;
    if (assignedFinger === 2) return 0.05;
    if (assignedFinger === 3) return 0.45;
    return 0.75;
  }
  if (futureDirection === 'down') {
    if (assignedFinger === 2) return 0;
    if (assignedFinger === 3) return 0.5;
    if (assignedFinger === 1) return 0.65;
    return 0.8;
  }
  if (assignedFinger === 2) return 0;
  if (assignedFinger === 1 || assignedFinger === 4) return 0.45;
  return 0.35;
}

function resolveEventHandPosition(
  currentHandPosition: number | null,
  positiveFrets: number[],
  lowestFutureFret: number | null,
  nearestFutureFret: number | null
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
    let directionalTargetFret: number | null = null;
    let futureDirection: 'up' | 'down' | 'steady' = 'steady';
    if (lowestFutureFret !== null && lowestFutureFret < minFret) {
      directionalTargetFret = lowestFutureFret;
      futureDirection = 'down';
    } else if (
      nearestFutureFret !== null &&
      nearestFutureFret > maxFret &&
      nearestFutureFret - minFret <= 2 &&
      minFret <= 3
    ) {
      directionalTargetFret = nearestFutureFret;
      futureDirection = 'up';
    }
    if (directionalTargetFret === null) {
      return base;
    }

    let best = base;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let candidate = lowerBound; candidate <= upperBound; candidate += 1) {
      const movementCost = Math.abs(candidate - previous);
      const futurePrepWeight = futureDirection === 'up' ? 1.25 : 1.3;
      const futurePrepCost = Math.abs(candidate - directionalTargetFret) * futurePrepWeight;
      const singleNotePenalty =
        positiveFrets.length === 1 ? getSingleNoteFingerPenalty(minFret, candidate, futureDirection) : 0;
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

interface HandPositionCandidate {
  handPosition: number;
  staticCost: number;
}

function getFutureDirection(
  positiveFretsByEvent: number[][],
  eventIndex: number,
  minFret: number,
  maxFret: number
) {
  const lowestFutureFret = resolveLowestFutureFret(positiveFretsByEvent, eventIndex, 4);
  if (lowestFutureFret !== null && lowestFutureFret < minFret) return 'down' as const;

  const nearestFutureFret = resolveNearestFutureFret(positiveFretsByEvent, eventIndex, 3);
  if (
    nearestFutureFret !== null &&
    nearestFutureFret > maxFret &&
    nearestFutureFret - minFret <= 2 &&
    minFret <= 3
  ) {
    return 'up' as const;
  }
  return 'steady' as const;
}

function buildHandPositionCandidatesForEvent(
  positiveFretsByEvent: number[][],
  eventIndex: number,
  level: MelodyFingeringLevel
): HandPositionCandidate[] {
  const positiveFrets = positiveFretsByEvent[eventIndex] ?? [];
  if (positiveFrets.length === 0) return [];

  const sorted = [...positiveFrets].sort((a, b) => a - b);
  const minFret = sorted[0];
  const maxFret = sorted[sorted.length - 1];
  const lowerBound = Math.max(1, maxFret - 3);
  const upperBound = minFret;
  const futureDirection = getFutureDirection(positiveFretsByEvent, eventIndex, minFret, maxFret);
  const eventSpan = maxFret - minFret;
  const positions: number[] = [];

  if (lowerBound <= upperBound) {
    for (let handPosition = lowerBound; handPosition <= upperBound; handPosition += 1) {
      positions.push(handPosition);
    }
  } else {
    positions.push(Math.max(1, minFret), Math.max(1, maxFret - 3));
  }

  const tuning = MINIMAX_LEVEL_TUNING[level];
  return [...new Set(positions)]
    .sort((a, b) => a - b)
    .map((handPosition) => {
      const lowPositionBias = handPosition * tuning.lowPositionBiasWeight;
      const spanCost = eventSpan * tuning.spanCostWeight;
      const singleNotePenalty =
        positiveFrets.length === 1
          ? getSingleNoteFingerPenalty(minFret, handPosition, futureDirection) * tuning.singleNotePenaltyScale
          : 0;
      return {
        handPosition,
        staticCost: lowPositionBias + spanCost + singleNotePenalty,
      };
    });
}

function getTransitionDifficulty(
  previousHandPosition: number,
  nextHandPosition: number,
  nextEventDurationBeats: number | null,
  level: MelodyFingeringLevel
) {
  const tuning = MINIMAX_LEVEL_TUNING[level];
  const handShift = Math.abs(nextHandPosition - previousHandPosition);
  let difficulty = handShift;
  if (handShift > 2) {
    difficulty += (handShift - 2) * tuning.longShiftExtraWeight;
  }
  if (nextEventDurationBeats !== null && nextEventDurationBeats > 0) {
    if (nextEventDurationBeats <= 0.25) {
      difficulty *= tuning.veryShortDurationMultiplier;
    } else if (nextEventDurationBeats <= 0.5) {
      difficulty *= tuning.shortDurationMultiplier;
    }
  }
  return difficulty;
}

interface DpCostState {
  maxTransition: number;
  totalCost: number;
  previousCandidateIndex: number;
}

function isLexicographicallyBetterDpState(candidate: DpCostState, current: DpCostState | null) {
  if (current === null) return true;
  if (candidate.maxTransition < current.maxTransition - 1e-9) return true;
  if (candidate.maxTransition > current.maxTransition + 1e-9) return false;
  return candidate.totalCost < current.totalCost - 1e-9;
}

function optimizeHandPositionsMinimax(
  events: MelodyEvent[],
  positiveFretsByEvent: number[][],
  level: MelodyFingeringLevel
) {
  const frettedEventIndexes = positiveFretsByEvent
    .map((positiveFrets, eventIndex) => ({ eventIndex, positiveFrets }))
    .filter((entry) => entry.positiveFrets.length > 0)
    .map((entry) => entry.eventIndex);

  if (frettedEventIndexes.length === 0) {
    return new Map<number, number>();
  }

  const candidatesByLayer = frettedEventIndexes.map((eventIndex) =>
    buildHandPositionCandidatesForEvent(positiveFretsByEvent, eventIndex, level)
  );
  const dp: DpCostState[][] = candidatesByLayer.map((layerCandidates) =>
    layerCandidates.map(() => ({
      maxTransition: Number.POSITIVE_INFINITY,
      totalCost: Number.POSITIVE_INFINITY,
      previousCandidateIndex: -1,
    }))
  );

  for (let candidateIndex = 0; candidateIndex < (candidatesByLayer[0]?.length ?? 0); candidateIndex += 1) {
    const candidate = candidatesByLayer[0][candidateIndex];
    dp[0][candidateIndex] = {
      maxTransition: 0,
      totalCost: candidate.staticCost,
      previousCandidateIndex: -1,
    };
  }

  for (let layerIndex = 1; layerIndex < candidatesByLayer.length; layerIndex += 1) {
    const currentCandidates = candidatesByLayer[layerIndex];
    const previousCandidates = candidatesByLayer[layerIndex - 1];
    const currentEventIndex = frettedEventIndexes[layerIndex];
    const currentDuration = events[currentEventIndex]?.durationBeats ?? null;

    for (let currentIndex = 0; currentIndex < currentCandidates.length; currentIndex += 1) {
      const currentCandidate = currentCandidates[currentIndex];
      let best: DpCostState | null = null;
      for (let previousIndex = 0; previousIndex < previousCandidates.length; previousIndex += 1) {
        const previousState = dp[layerIndex - 1][previousIndex];
        if (!Number.isFinite(previousState.totalCost)) continue;
        const previousCandidate = previousCandidates[previousIndex];
        const transitionDifficulty = getTransitionDifficulty(
          previousCandidate.handPosition,
          currentCandidate.handPosition,
          currentDuration,
          level
        );
        const nextState: DpCostState = {
          maxTransition: Math.max(previousState.maxTransition, transitionDifficulty),
          totalCost: previousState.totalCost + transitionDifficulty + currentCandidate.staticCost,
          previousCandidateIndex: previousIndex,
        };
        if (isLexicographicallyBetterDpState(nextState, best)) {
          best = nextState;
        }
      }
      if (best !== null) {
        dp[layerIndex][currentIndex] = best;
      }
    }
  }

  const lastLayerIndex = dp.length - 1;
  let bestLastIndex = -1;
  let bestLastState: DpCostState | null = null;
  for (let candidateIndex = 0; candidateIndex < dp[lastLayerIndex].length; candidateIndex += 1) {
    const state = dp[lastLayerIndex][candidateIndex];
    if (!Number.isFinite(state.totalCost)) continue;
    if (isLexicographicallyBetterDpState(state, bestLastState)) {
      bestLastState = state;
      bestLastIndex = candidateIndex;
    }
  }

  const chosenByEventIndex = new Map<number, number>();
  let cursor = bestLastIndex;
  for (let layerIndex = lastLayerIndex; layerIndex >= 0; layerIndex -= 1) {
    if (cursor < 0) break;
    const eventIndex = frettedEventIndexes[layerIndex];
    const handPosition = candidatesByLayer[layerIndex]?.[cursor]?.handPosition;
    if (typeof handPosition === 'number') {
      chosenByEventIndex.set(eventIndex, handPosition);
    }
    cursor = dp[layerIndex][cursor]?.previousCandidateIndex ?? -1;
  }
  return chosenByEventIndex;
}

function buildWithHeuristic(playableEvents: ChordNote[][], positiveFretsByEvent: number[][]) {
  let handPosition: number | null = null;
  return playableEvents.map((playable, eventIndex) => {
    const positiveFrets = positiveFretsByEvent[eventIndex] ?? [];
    const lowestFutureFret = resolveLowestFutureFret(positiveFretsByEvent, eventIndex, 4);
    const nearestFutureFret = resolveNearestFutureFret(positiveFretsByEvent, eventIndex, 3);
    handPosition = resolveEventHandPosition(handPosition, positiveFrets, lowestFutureFret, nearestFutureFret);
    return playable.map((note) => {
      if (typeof note.finger === 'number') {
        return { ...note, finger: note.finger };
      }
      if (note.fret <= 0) {
        return { ...note, finger: 0 };
      }
      const finger = handPosition === null ? 1 : clamp(note.fret - handPosition + 1, 1, 4);
      return { ...note, finger };
    });
  });
}

function buildWithMinimax(
  events: MelodyEvent[],
  playableEvents: ChordNote[][],
  positiveFretsByEvent: number[][],
  level: MelodyFingeringLevel
) {
  const chosenHandPositions = optimizeHandPositionsMinimax(events, positiveFretsByEvent, level);
  let handPosition: number | null = null;
  return playableEvents.map((playable, eventIndex) => {
    const optimized = chosenHandPositions.get(eventIndex);
    if (typeof optimized === 'number') {
      handPosition = optimized;
    } else if (handPosition === null) {
      const positiveFrets = positiveFretsByEvent[eventIndex] ?? [];
      if (positiveFrets.length > 0) {
        handPosition = Math.max(1, Math.min(...positiveFrets));
      }
    }
    return playable.map((note) => {
      if (typeof note.finger === 'number') {
        return { ...note, finger: note.finger };
      }
      if (note.fret <= 0) {
        return { ...note, finger: 0 };
      }
      const finger = handPosition === null ? 1 : clamp(note.fret - handPosition + 1, 1, 4);
      return { ...note, finger };
    });
  });
}

export function buildMelodyFingeredEvents(events: MelodyEvent[], options: MelodyFingeringOptions = {}): ChordNote[][] {
  const playableEvents = events.map((event) => toPlayableEventNotes(event));
  const positiveFretsByEvent = playableEvents.map((playable) =>
    playable.map((note) => note.fret).filter((fret) => fret > 0)
  );
  const strategy = normalizeMelodyFingeringStrategy(options.strategy);
  const level = normalizeMelodyFingeringLevel(options.level);
  if (strategy === 'minimax') {
    return buildWithMinimax(events, playableEvents, positiveFretsByEvent, level);
  }
  return buildWithHeuristic(playableEvents, positiveFretsByEvent);
}

export function getMelodyFingeredEvent(
  events: MelodyEvent[],
  eventIndex: number,
  options: MelodyFingeringOptions = {}
): ChordNote[] {
  if (eventIndex < 0 || eventIndex >= events.length) return [];
  return buildMelodyFingeredEvents(events, options)[eventIndex] ?? [];
}
