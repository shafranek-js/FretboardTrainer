import { isMelodyWorkflowMode } from './training-mode-groups';
import type { UiWorkflow } from './training-workflows';

const STRING_SCOPED_LEARN_NOTES_MODES = new Set(['random', 'adaptive', 'free', 'intervals', 'scales', 'timed']);

export interface SessionToolsVisibility {
  showPlanSection: boolean;
  showDisplaySection: boolean;
  showActiveStringsSection: boolean;
  showShowAllNotesRow: boolean;
  showShowStringTogglesRow: boolean;
  showAutoPlayPromptSoundRow: boolean;
  showRelaxPerformanceOctaveRow: boolean;
  showPitchMatchRow: boolean;
  showTimingWindowRow: boolean;
  showMicLatencyRow: boolean;
  dimPrimaryControls: boolean;
}

export interface WorkflowLayout {
  showPracticeSetup: boolean;
  showMelodySetup: boolean;
  showPlaybackControls: boolean;
  showDisplayControls: boolean;
  showSessionTools: boolean;
  showSessionToolsContent: boolean;
  showMelodyActionControls: boolean;
  showMelodyPracticeControls: boolean;
  showEditingToolsControls: boolean;
  showPlaybackQuickControls: boolean;
  showPlaybackPromptSoundControl: boolean;
  showMelodyNoteHintDisplayControl: boolean;
  showMelodyDisplayControls: boolean;
  showLayoutZoomControls: boolean;
  showTimelineZoomControl: boolean;
  showScrollingZoomControl: boolean;
  showAnyZoomControl: boolean;
  sessionTools: SessionToolsVisibility;
}

export interface ResolveWorkflowLayoutOptions {
  workflow: UiWorkflow;
  trainingMode: string;
  showTabTimeline?: boolean;
  showScrollingTab?: boolean;
}

export function resolveWorkflowLayout(options: ResolveWorkflowLayoutOptions): WorkflowLayout {
  const { workflow, trainingMode } = options;
  const showTabTimeline = options.showTabTimeline ?? true;
  const showScrollingTab = options.showScrollingTab ?? true;
  const showPracticeSetup = workflow === 'learn-notes';
  const showMelodySetup = workflow === 'library' || workflow === 'editor' || isMelodyWorkflowMode(trainingMode);
  const showPlaybackControls = workflow !== 'learn-notes' && showMelodySetup;
  const showDisplayControls = workflow === 'learn-notes' || showMelodySetup;
  const showSessionTools = workflow !== 'library' && workflow !== 'editor' && trainingMode !== 'rhythm';
  const showMelodyActionControls = workflow === 'library' || workflow === 'editor';
  const showMelodyPracticeControls = false;
  const showEditingToolsControls = workflow === 'editor';
  const showPlaybackQuickControls = workflow === 'study-melody' || workflow === 'practice' || workflow === 'perform';
  const showPlaybackPromptSoundControl = workflow === 'practice' || workflow === 'perform';
  const showMelodyNoteHintDisplayControl = showPlaybackQuickControls;
  const showMelodyDisplayControls = workflow !== 'learn-notes';
  const showLayoutZoomControls = workflow !== 'learn-notes';
  const showTimelineZoomControl = showLayoutZoomControls && showTabTimeline;
  const showScrollingZoomControl = showLayoutZoomControls && showScrollingTab;
  const showAnyZoomControl = showTimelineZoomControl || showScrollingZoomControl;
  const showPlanSection = workflow === 'learn-notes' && trainingMode !== 'free';
  const showActiveStringsSection = workflow === 'learn-notes' && STRING_SCOPED_LEARN_NOTES_MODES.has(trainingMode);
  const showShowAllNotesRow = workflow === 'learn-notes' && trainingMode !== 'free' && trainingMode !== 'rhythm';
  const showShowStringTogglesRow = showActiveStringsSection;
  const showAutoPlayPromptSoundRow = workflow === 'learn-notes' || showPlaybackPromptSoundControl;
  const showRelaxPerformanceOctaveRow = false;
  const showPitchMatchRow = false;
  const showTimingWindowRow = false;
  const showMicLatencyRow = false;
  const showDisplaySection =
    (workflow === 'learn-notes' && showAutoPlayPromptSoundRow) ||
    showRelaxPerformanceOctaveRow ||
    showPitchMatchRow ||
    showTimingWindowRow ||
    showMicLatencyRow;
  const sessionTools: SessionToolsVisibility = {
    showPlanSection,
    showDisplaySection,
    showActiveStringsSection,
    showShowAllNotesRow,
    showShowStringTogglesRow,
    showAutoPlayPromptSoundRow,
    showRelaxPerformanceOctaveRow,
    showPitchMatchRow,
    showTimingWindowRow,
    showMicLatencyRow,
    dimPrimaryControls: trainingMode === 'free',
  };
  const showSessionToolsContent =
    sessionTools.showPlanSection || sessionTools.showDisplaySection || sessionTools.showActiveStringsSection;

  return {
    showPracticeSetup,
    showMelodySetup,
    showPlaybackControls,
    showDisplayControls,
    showSessionTools,
    showSessionToolsContent,
    showMelodyActionControls,
    showMelodyPracticeControls,
    showEditingToolsControls,
    showPlaybackQuickControls,
    showPlaybackPromptSoundControl,
    showMelodyNoteHintDisplayControl,
    showMelodyDisplayControls,
    showLayoutZoomControls,
    showTimelineZoomControl,
    showScrollingZoomControl,
    showAnyZoomControl,
    sessionTools,
  };
}
