import type { UiWorkflow } from './training-workflows';

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

export function resolveSessionToolsVisibility(mode: string, workflow: UiWorkflow): SessionToolsVisibility {
  const stringScopedLearnNotesModes = new Set(['random', 'adaptive', 'free', 'intervals', 'scales', 'timed']);
  const showPlanSection = workflow === 'learn-notes' && mode !== 'free';
  const showActiveStringsSection =
    workflow === 'learn-notes' && stringScopedLearnNotesModes.has(mode);
  const showShowAllNotesRow = workflow === 'learn-notes' && mode !== 'free' && mode !== 'rhythm';
  const showShowStringTogglesRow = showActiveStringsSection;
  const showAutoPlayPromptSoundRow =
    workflow === 'learn-notes' ||
    workflow === 'study-melody' ||
    workflow === 'practice' ||
    workflow === 'perform';
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

  return {
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
    dimPrimaryControls: mode === 'free',
  };
}
