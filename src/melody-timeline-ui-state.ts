import type { IInstrument } from './instruments/instrument';
import { getMelodyById, type MelodyDefinition } from './melody-library';
import { exportMelodyToAsciiTab } from './melody-ascii-export';
import { getMelodyFingeredEvent } from './melody-fingering';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from './melody-fingering';
import { normalizeMelodyStudyRange } from './melody-study-range';
import { getMelodyWithPracticeAdjustments } from './melody-string-shift';
import { isMelodyWorkflowMode, isPerformanceStyleMode } from './training-mode-groups';
import type { ChordNote } from './types';
import {
  buildPerformanceTimelineFeedbackKey,
  type PerformanceTimelineFeedbackByEvent,
} from './performance-timeline-feedback';

type InstrumentLike = Pick<IInstrument, 'name' | 'STRING_ORDER' | 'getNoteWithOctave'>;

export interface ResolvedSelectedMelody {
  baseMelody: MelodyDefinition | null;
  melody: MelodyDefinition | null;
}

export interface MelodyFretboardPreview {
  eventFingering: ChordNote[];
  targetNote: string | null;
  targetString: string | null;
}

export interface MelodyTimelineRenderState {
  baseMelody: MelodyDefinition;
  melody: MelodyDefinition;
  activeIndex: number | null;
  modeLabel: string | null;
  studyRange: { startIndex: number; endIndex: number };
  performanceFeedbackByEvent: PerformanceTimelineFeedbackByEvent | null;
  showPrerollLeadIn: boolean;
  editingEnabled: boolean;
  copyText: string;
}

export function resolveSelectedMelody(input: {
  selectedMelodyId: string;
  instrument: InstrumentLike;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
}): ResolvedSelectedMelody {
  const baseMelody = input.selectedMelodyId ? getMelodyById(input.selectedMelodyId, input.instrument) : null;
  const melody =
    baseMelody === null
      ? null
      : getMelodyWithPracticeAdjustments(
          baseMelody,
          input.melodyTransposeSemitones,
          input.melodyStringShift,
          input.instrument
        );

  return { baseMelody, melody };
}

export function resolveMelodyFretboardPreview(input: {
  trainingMode: string;
  isListening: boolean;
  melodyTimelinePreviewIndex: number | null;
  selectedMelodyId: string;
  instrument: InstrumentLike;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
  melodyFingeringStrategy?: MelodyFingeringStrategy;
  melodyFingeringLevel?: MelodyFingeringLevel;
}): MelodyFretboardPreview {
  if (!isMelodyWorkflowMode(input.trainingMode) || input.isListening || typeof input.melodyTimelinePreviewIndex !== 'number') {
    return {
      eventFingering: [],
      targetNote: null,
      targetString: null,
    };
  }

  const { melody } = resolveSelectedMelody(input);
  if (!melody || melody.events.length === 0) {
    return {
      eventFingering: [],
      targetNote: null,
      targetString: null,
    };
  }

  const safeIndex = Math.max(0, Math.min(melody.events.length - 1, input.melodyTimelinePreviewIndex));
  const previewEvent = melody.events[safeIndex];
  const eventFingering = getMelodyFingeredEvent(melody.events, safeIndex, {
    strategy: input.melodyFingeringStrategy ?? 'minimax',
    level: input.melodyFingeringLevel ?? 'beginner',
  });
  const firstPlayable = eventFingering[0] ?? null;
  const firstEventNote = previewEvent?.notes[0] ?? null;

  return {
    eventFingering,
    targetNote: firstPlayable?.note ?? firstEventNote?.note ?? null,
    targetString: firstPlayable?.string ?? firstEventNote?.stringName ?? null,
  };
}

export function resolveMelodyTimelineRenderState(input: {
  trainingMode: string;
  selectedMelodyId: string;
  instrument: InstrumentLike;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
  melodyFingeringStrategy?: MelodyFingeringStrategy;
  melodyFingeringLevel?: MelodyFingeringLevel;
  melodyStudyRangeStartIndex: number;
  melodyStudyRangeEndIndex: number;
  isListening: boolean;
  currentMelodyEventIndex: number;
  performanceActiveEventIndex: number | null;
  melodyTimelinePreviewIndex: number | null;
  melodyTimelinePreviewLabel: string | null;
  performanceTimelineFeedbackKey: string | null;
  performanceTimelineFeedbackByEvent: PerformanceTimelineFeedbackByEvent;
}): MelodyTimelineRenderState | null {
  const { baseMelody, melody } = resolveSelectedMelody(input);
  const inMelodyMode = isMelodyWorkflowMode(input.trainingMode);
  if (!baseMelody || !melody || !inMelodyMode) {
    return null;
  }

  let activeIndex: number | null = null;
  let modeLabel: string | null = null;

  if (typeof input.melodyTimelinePreviewIndex === 'number') {
    activeIndex = input.melodyTimelinePreviewIndex;
    modeLabel = input.melodyTimelinePreviewLabel ?? 'Preview';
  } else {
    const sessionIndex =
      isPerformanceStyleMode(input.trainingMode) && input.isListening
        ? input.performanceActiveEventIndex
        : input.currentMelodyEventIndex - 1;
    if (Number.isFinite(sessionIndex) && sessionIndex >= 0) {
      activeIndex = sessionIndex;
    }
    modeLabel = input.isListening ? 'Session' : null;
  }

  const studyRange = normalizeMelodyStudyRange(
    {
      startIndex: input.melodyStudyRangeStartIndex,
      endIndex: input.melodyStudyRangeEndIndex,
    },
    melody.events.length
  );

  const performanceFeedbackKey = buildPerformanceTimelineFeedbackKey({
    melodyId: melody.id,
    instrumentName: input.instrument.name,
    melodyTransposeSemitones: input.melodyTransposeSemitones,
    melodyStringShift: input.melodyStringShift,
  });
  const performanceFeedbackByEvent =
    isPerformanceStyleMode(input.trainingMode) &&
    performanceFeedbackKey !== null &&
    input.performanceTimelineFeedbackKey === performanceFeedbackKey
      ? input.performanceTimelineFeedbackByEvent
      : null;

  const editingEnabled =
    baseMelody.source === 'custom' &&
    typeof baseMelody.tabText !== 'string' &&
    input.melodyTransposeSemitones === 0 &&
    input.melodyStringShift === 0;

  const copyText =
    input.melodyTransposeSemitones === 0 &&
    input.melodyStringShift === 0 &&
    typeof baseMelody.tabText === 'string' &&
    baseMelody.tabText.trim().length > 0
      ? baseMelody.tabText.trim()
      : exportMelodyToAsciiTab(melody, input.instrument);

  return {
    baseMelody,
    melody,
    activeIndex,
    modeLabel,
    studyRange,
    performanceFeedbackByEvent,
    showPrerollLeadIn: isPerformanceStyleMode(input.trainingMode),
    editingEnabled,
    copyText,
  };
}
