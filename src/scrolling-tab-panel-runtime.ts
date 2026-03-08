import type { MelodyDefinition } from './melody-library';
import type { Prompt } from './types';
import { getMelodyEventPlaybackDurationExactMs } from './melody-timeline-duration';
import { isPerformanceStyleMode } from './training-mode-groups';

export interface ScrollingTabPanelRuntimeState {
  currentTimeSec: number | null;
  shouldAnimate: boolean;
  leadInSec: number;
}

interface ScrollingTabPanelRuntimeInput {
  melody: MelodyDefinition;
  bpm: number;
  studyRange: { startIndex: number; endIndex: number };
  trainingMode: string;
  isListening: boolean;
  currentPrompt: Prompt | null;
  promptStartedAtMs: number;
  currentMelodyEventIndex: number;
  performanceActiveEventIndex: number | null;
  melodyDemoRuntimeActive: boolean;
  melodyDemoRuntimePaused: boolean;
  melodyDemoRuntimeBaseTimeSec: number;
  melodyDemoRuntimeAnchorStartedAtMs: number | null;
  melodyDemoRuntimePausedOffsetSec: number;
  performancePrerollLeadInVisible: boolean;
  performancePrerollStartedAtMs: number | null;
  performancePrerollDurationMs: number;
  performanceRuntimeStartedAtMs: number | null;
  nowMs: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sumEventDurationsSec(
  melody: MelodyDefinition,
  bpm: number,
  startIndex: number,
  endExclusiveIndex: number
) {
  let totalSec = 0;
  for (let index = startIndex; index < endExclusiveIndex; index += 1) {
    const event = melody.events[index];
    if (!event) continue;
    totalSec += getMelodyEventPlaybackDurationExactMs(event, bpm, melody) / 1000;
  }
  return totalSec;
}

export function resolveScrollingTabPanelRuntimeState(
  input: ScrollingTabPanelRuntimeInput
): ScrollingTabPanelRuntimeState {
  if (input.melodyDemoRuntimeActive) {
    const elapsedSec = input.melodyDemoRuntimePaused
      ? input.melodyDemoRuntimePausedOffsetSec
      : input.melodyDemoRuntimeAnchorStartedAtMs === null
        ? 0
        : Math.max(0, (input.nowMs - input.melodyDemoRuntimeAnchorStartedAtMs) / 1000);
    return {
      currentTimeSec: input.melodyDemoRuntimeBaseTimeSec + elapsedSec,
      shouldAnimate: !input.melodyDemoRuntimePaused,
      leadInSec: 0,
    };
  }

  const leadInSec = Math.max(0, input.performancePrerollDurationMs / 1000);
  if (
    isPerformanceStyleMode(input.trainingMode) &&
    input.performancePrerollLeadInVisible &&
    input.performancePrerollStartedAtMs !== null
  ) {
    return {
      currentTimeSec: clamp((input.nowMs - input.performancePrerollStartedAtMs) / 1000, 0, leadInSec),
      shouldAnimate: true,
      leadInSec,
    };
  }

  if (
    isPerformanceStyleMode(input.trainingMode) &&
    input.isListening &&
    input.performanceRuntimeStartedAtMs !== null
  ) {
    const totalPerformanceDurationSec =
      leadInSec +
      sumEventDurationsSec(
        input.melody,
        input.bpm,
        input.studyRange.startIndex,
        input.studyRange.endIndex + 1
      );
    return {
      currentTimeSec: clamp(
        leadInSec + Math.max(0, (input.nowMs - input.performanceRuntimeStartedAtMs) / 1000),
        0,
        totalPerformanceDurationSec
      ),
      shouldAnimate: true,
      leadInSec,
    };
  }

  if (isPerformanceStyleMode(input.trainingMode) && input.isListening && input.currentPrompt) {
    const activeEventIndex =
      typeof input.performanceActiveEventIndex === 'number'
        ? input.performanceActiveEventIndex
        : input.currentMelodyEventIndex - 1;
    if (
      Number.isInteger(activeEventIndex) &&
      activeEventIndex >= input.studyRange.startIndex &&
      activeEventIndex <= input.studyRange.endIndex
    ) {
      const baseSec =
        leadInSec +
        sumEventDurationsSec(input.melody, input.bpm, input.studyRange.startIndex, activeEventIndex);
      const elapsedSec = Math.max(0, (input.nowMs - input.promptStartedAtMs) / 1000);
      return {
        currentTimeSec: baseSec + elapsedSec,
        shouldAnimate: true,
        leadInSec,
      };
    }
  }

  if (isPerformanceStyleMode(input.trainingMode) && input.isListening) {
    const settledEventIndex = clamp(
      input.currentMelodyEventIndex,
      input.studyRange.startIndex,
      input.studyRange.endIndex + 1
    );
    const baseSec =
      leadInSec +
      sumEventDurationsSec(input.melody, input.bpm, input.studyRange.startIndex, settledEventIndex);
    return {
      currentTimeSec: baseSec,
      shouldAnimate: true,
      leadInSec,
    };
  }

  return {
    currentTimeSec: null,
    shouldAnimate: false,
    leadInSec: isPerformanceStyleMode(input.trainingMode) ? Math.max(leadInSec, 2) : 1.4,
  };
}
