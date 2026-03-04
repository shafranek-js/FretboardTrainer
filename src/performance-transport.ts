import type { MelodyDefinition } from './melody-library';
import { getMelodyEventPlaybackDurationMs } from './melody-timeline-duration';

export interface PerformanceTransportFrame {
  activeEventIndex: number | null;
  eventStartedAtMs: number | null;
  elapsedSec: number;
  isComplete: boolean;
}

interface PerformanceTransportInput {
  melody: MelodyDefinition;
  bpm: number;
  studyRange: { startIndex: number; endIndex: number };
  runtimeStartedAtMs: number;
  nowMs: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildEventStartOffsetsSec(
  melody: MelodyDefinition,
  bpm: number,
  studyRange: { startIndex: number; endIndex: number }
) {
  const startOffsetsSec: number[] = [];
  let elapsedSec = 0;
  for (let index = studyRange.startIndex; index <= studyRange.endIndex; index += 1) {
    startOffsetsSec.push(elapsedSec);
    const event = melody.events[index];
    if (!event) continue;
    elapsedSec += getMelodyEventPlaybackDurationMs(event, bpm, melody) / 1000;
  }
  return {
    startOffsetsSec,
    totalDurationSec: elapsedSec,
  };
}

export function resolvePerformanceTransportFrame(
  input: PerformanceTransportInput
): PerformanceTransportFrame {
  const safeStartIndex = clamp(
    input.studyRange.startIndex,
    0,
    Math.max(0, input.melody.events.length - 1)
  );
  const safeEndIndex = clamp(
    input.studyRange.endIndex,
    safeStartIndex,
    Math.max(safeStartIndex, input.melody.events.length - 1)
  );
  const studyRange = { startIndex: safeStartIndex, endIndex: safeEndIndex };
  const elapsedSec = Math.max(0, (input.nowMs - input.runtimeStartedAtMs) / 1000);
  const { startOffsetsSec, totalDurationSec } = buildEventStartOffsetsSec(input.melody, input.bpm, studyRange);

  if (startOffsetsSec.length === 0) {
    return {
      activeEventIndex: null,
      eventStartedAtMs: null,
      elapsedSec,
      isComplete: true,
    };
  }

  if (elapsedSec >= totalDurationSec) {
    return {
      activeEventIndex: null,
      eventStartedAtMs: input.runtimeStartedAtMs + Math.round(totalDurationSec * 1000),
      elapsedSec,
      isComplete: true,
    };
  }

  let localEventIndex = 0;
  for (let index = startOffsetsSec.length - 1; index >= 0; index -= 1) {
    if (elapsedSec >= startOffsetsSec[index]) {
      localEventIndex = index;
      break;
    }
  }

  const activeEventIndex = studyRange.startIndex + localEventIndex;
  return {
    activeEventIndex,
    eventStartedAtMs: input.runtimeStartedAtMs + Math.round(startOffsetsSec[localEventIndex] * 1000),
    elapsedSec,
    isComplete: false,
  };
}
