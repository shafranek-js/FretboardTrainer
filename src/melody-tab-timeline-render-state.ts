import type { TimelineDurationLayout } from './melody-timeline-duration';
import type { MelodyDefinition } from './melody-library';
import type { MelodyTabTimelineViewModel } from './melody-tab-timeline-model';
import type { TimelineBarGrouping } from './melody-tab-timeline-metadata';
import type { MelodyStudyRange } from './melody-study-range';
import type { PerformanceTimelineFeedbackByEvent } from './performance-timeline-feedback';
import type { MelodyFingeringLevel, MelodyFingeringStrategy } from './melody-fingering';

export interface MelodyTimelineRenderOptions {
  modeLabel?: string | null;
  viewMode?: 'classic' | 'grid';
  fingeringStrategy?: MelodyFingeringStrategy;
  fingeringLevel?: MelodyFingeringLevel;
  zoomScale?: number;
  bpm?: number;
  studyRange?: MelodyStudyRange | null;
  showStepNumbers?: boolean;
  showMetaDetails?: boolean;
  minimapRangeEditor?: boolean;
  showPrerollLeadIn?: boolean;
  activePrerollStepIndex?: number | null;
  currentTimeSec?: number | null;
  leadInSec?: number;
  editingEnabled?: boolean;
  selectedEventIndex?: number | null;
  selectedNoteIndex?: number | null;
  performanceFeedbackByEvent?: PerformanceTimelineFeedbackByEvent | null;
}

export interface ResolvedMelodyTimelineRenderOptions {
  modeLabel: string;
  viewMode: 'classic' | 'grid';
  fingeringStrategy: MelodyFingeringStrategy;
  fingeringLevel: MelodyFingeringLevel;
  zoomScale: number;
  bpm: number | null;
  studyRange: MelodyStudyRange;
  showStepNumbers: boolean;
  showMetaDetails: boolean;
  minimapRangeEditor: boolean;
  showPrerollLeadIn: boolean;
  activePrerollStepIndex: number | null;
  currentTimeSec: number | null;
  leadInSec: number;
  editingEnabled: boolean;
  selectedEventIndex: number | null;
  selectedNoteIndex: number | null;
  performanceFeedbackByEvent: PerformanceTimelineFeedbackByEvent | null;
}

interface RenderKeyInput {
  melody: Pick<MelodyDefinition, 'id' | 'events'>;
  stringOrder: string[];
  melodyContentSignature: string;
  model: Pick<MelodyTabTimelineViewModel, 'activeEventIndex'>;
  barGrouping: TimelineBarGrouping;
  durationLayout: TimelineDurationLayout;
  studyRange: MelodyStudyRange;
  contextMenuSignature: string;
  activeTimelineNoteDragSource: { eventIndex: number; noteIndex: number } | null;
  includePerformanceFeedbackSignature?: boolean;
}

interface MetaTextInput {
  modeLabel: string;
  viewMode: 'classic' | 'grid';
  model: Pick<MelodyTabTimelineViewModel, 'activeEventIndex' | 'totalEvents'>;
  barGrouping: TimelineBarGrouping;
  durationLayout: TimelineDurationLayout;
  studyRangeText: string;
  showMetaDetails: boolean;
}

function formatPerformanceFeedbackSignature(
  feedbackByEvent: PerformanceTimelineFeedbackByEvent | null
) {
  return Object.entries(feedbackByEvent ?? {})
    .map(([eventIndex, attempts]) =>
      `${eventIndex}:${attempts
        .map((attempt) => `${attempt.status}-${attempt.note}-${attempt.stringName ?? '-'}-${attempt.fret ?? '-'}`)
        .join(',')}`
    )
    .join(';');
}

export function resolveMelodyTimelineRenderOptions(
  options: MelodyTimelineRenderOptions,
  studyRange: MelodyStudyRange
): ResolvedMelodyTimelineRenderOptions {
  return {
    modeLabel: options.modeLabel?.trim() ?? '',
    viewMode: options.viewMode ?? 'classic',
    fingeringStrategy: options.fingeringStrategy === 'heuristic' ? 'heuristic' : 'minimax',
    fingeringLevel:
      options.fingeringLevel === 'advanced'
        ? 'advanced'
        : options.fingeringLevel === 'intermediate'
          ? 'intermediate'
          : 'beginner',
    zoomScale: Math.max(0.7, Math.min(2.5, options.zoomScale ?? 1)),
    bpm: typeof options.bpm === 'number' && Number.isFinite(options.bpm) ? options.bpm : null,
    studyRange,
    showStepNumbers: options.showStepNumbers ?? false,
    showMetaDetails: options.showMetaDetails ?? false,
    minimapRangeEditor: options.minimapRangeEditor ?? true,
    showPrerollLeadIn: options.showPrerollLeadIn ?? false,
    activePrerollStepIndex: options.activePrerollStepIndex ?? null,
    currentTimeSec:
      typeof options.currentTimeSec === 'number' && Number.isFinite(options.currentTimeSec)
        ? Math.max(0, options.currentTimeSec)
        : null,
    leadInSec:
      typeof options.leadInSec === 'number' && Number.isFinite(options.leadInSec)
        ? Math.max(0, options.leadInSec)
        : 0,
    editingEnabled: options.editingEnabled ?? false,
    selectedEventIndex: options.selectedEventIndex ?? null,
    selectedNoteIndex: options.selectedNoteIndex ?? null,
    performanceFeedbackByEvent: options.performanceFeedbackByEvent ?? null,
  };
}

export function buildMelodyTimelineRenderKey(
  input: RenderKeyInput,
  options: ResolvedMelodyTimelineRenderOptions
) {
  const durationSignature = input.durationLayout.weights
    .map((weight, index) => `${index}:${Math.round(weight * 100)}`)
    .join(',');
  return [
    input.melody.id,
    input.melody.events.length,
    input.melodyContentSignature,
    input.model.activeEventIndex ?? -1,
    options.modeLabel,
    options.viewMode,
    options.fingeringStrategy,
    options.fingeringLevel,
    input.barGrouping.source,
    input.barGrouping.totalBars ?? -1,
    input.barGrouping.hasBeatTiming ? 1 : 0,
    input.durationLayout.source,
    durationSignature,
    options.studyRange.startIndex,
    options.studyRange.endIndex,
    options.showStepNumbers ? 1 : 0,
    Math.round(options.zoomScale * 100),
    options.minimapRangeEditor ? 1 : 0,
    options.showPrerollLeadIn ? 1 : 0,
    options.activePrerollStepIndex ?? -1,
    options.selectedEventIndex ?? -1,
    options.selectedNoteIndex ?? -1,
    input.includePerformanceFeedbackSignature === false
      ? ''
      : formatPerformanceFeedbackSignature(options.performanceFeedbackByEvent),
    input.activeTimelineNoteDragSource?.eventIndex ?? -1,
    input.activeTimelineNoteDragSource?.noteIndex ?? -1,
    input.contextMenuSignature,
    input.stringOrder.join(','),
  ].join('|');
}

export function buildMelodyTimelineMetaText(input: MetaTextInput) {
  if (!input.showMetaDetails) return '';

  const stepText =
    input.model.activeEventIndex === null
      ? `Step -/${input.model.totalEvents}`
      : `Step ${input.model.activeEventIndex + 1}/${input.model.totalEvents}`;
  const viewLabel = input.viewMode === 'classic' ? 'Classic TAB' : 'Grid';
  const barText = (() => {
    if (typeof input.barGrouping.totalBars !== 'number') return '';
    const base = ` | ${input.barGrouping.totalBars} bar${input.barGrouping.totalBars === 1 ? '' : 's'}`;
    if (input.barGrouping.hasBeatTiming && typeof input.barGrouping.beatsPerBar === 'number') {
      return `${base} (${input.barGrouping.beatsPerBar}/4)`;
    }
    return base;
  })();
  const durationText = (() => {
    if (!input.durationLayout.hasDurationData) return '';
    if (input.durationLayout.source === 'beats') return ' | Duration: beat-scaled';
    if (input.durationLayout.source === 'columns') return ' | Duration: column-scaled';
    return ' | Duration: mixed';
  })();
  const baseText = `${viewLabel} | ${stepText}${barText}${durationText}${input.studyRangeText}`;
  return input.modeLabel ? `${input.modeLabel} | ${baseText}` : baseText;
}
