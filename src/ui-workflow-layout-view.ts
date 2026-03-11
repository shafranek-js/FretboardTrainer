import { dom } from './dom';
import type { TrainingModeUiVisibility } from './training-mode-ui';
import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import type { WorkflowLayout } from './workflow-layout';
import type {
  MelodySelectionSectionCopy,
  TrainingModeFieldCopy,
  WorkflowUiCopy,
} from './workflow-ui-copy';

export type ToggleVisualStateRenderer = (button: HTMLButtonElement, expanded: boolean) => void;
export type ButtonVisualStateRenderer = (button: HTMLButtonElement, active: boolean) => void;

interface WorkflowCopyViewState {
  workflow: UiWorkflow;
  copy: WorkflowUiCopy;
  melodySelectionCopy: MelodySelectionSectionCopy;
  trainingModeCopy: TrainingModeFieldCopy;
}

interface TrainingModeFieldVisibilityViewState {
  visibility: TrainingModeUiVisibility;
  trainingModeCopy: TrainingModeFieldCopy;
}

export function renderWorkflowSwitcherView(
  workflow: UiWorkflow,
  setWorkflowButtonVisualState: ButtonVisualStateRenderer
) {
  setWorkflowButtonVisualState(dom.workflowLearnNotesBtn, workflow === 'learn-notes');
  setWorkflowButtonVisualState(dom.workflowStudyMelodyBtn, workflow === 'study-melody');
  setWorkflowButtonVisualState(dom.workflowPracticeBtn, workflow === 'practice');
  setWorkflowButtonVisualState(dom.workflowPerformBtn, workflow === 'perform');
  setWorkflowButtonVisualState(dom.workflowLibraryBtn, workflow === 'library');
  setWorkflowButtonVisualState(dom.workflowEditorBtn, workflow === 'editor');
}

export function renderUiModeSwitcherView(
  uiMode: UiMode,
  setWorkflowButtonVisualState: ButtonVisualStateRenderer
) {
  setWorkflowButtonVisualState(dom.uiModeSimpleBtn, uiMode === 'simple');
  setWorkflowButtonVisualState(dom.uiModeAdvancedBtn, uiMode === 'advanced');
}

export function renderUiModeVisibilityView(uiMode: UiMode, showTrainingModeField: boolean) {
  const isAdvanced = uiMode === 'advanced';
  dom.trainingModeField.classList.toggle('hidden', !showTrainingModeField);
  dom.micAttackFilterRow.classList.toggle('hidden', !isAdvanced);
  dom.micHoldFilterRow.classList.toggle('hidden', !isAdvanced);
  dom.micPolyphonicDetectorRow.classList.toggle('hidden', !isAdvanced);
  dom.performanceMicLatencyCompensationExact.classList.toggle('hidden', !isAdvanced);
  dom.micPolyphonicActionsRow.classList.toggle('hidden', !isAdvanced);
  dom.micPolyphonicBenchmarkInfo.classList.toggle('hidden', !isAdvanced);
  dom.micNoiseGateInfo.classList.toggle('hidden', !isAdvanced);
}

export function renderWorkflowCopyView({
  workflow,
  copy,
  melodySelectionCopy,
  trainingModeCopy,
}: WorkflowCopyViewState) {
  dom.learningControls.dataset.panelLayout = workflow === 'learn-notes' ? 'learn-notes' : 'default';
  dom.trainingModeLabel.textContent = trainingModeCopy.label;
  dom.trainingModeField.dataset.fieldHint = trainingModeCopy.fieldHintPrefix;
  dom.melodySetupToggleLabelMobile.textContent = copy.melodySetupLabelMobile;
  dom.melodySetupToggleLabelDesktop.textContent = copy.melodySetupLabelDesktop;
  dom.sessionToolsToggleLabelMobile.textContent = copy.sessionToolsLabelMobile;
  dom.sessionToolsToggleLabelDesktop.textContent = copy.sessionToolsLabelDesktop;
  dom.melodyWorkspaceTransportTitle.textContent = copy.melodyWorkspaceTitle;
  dom.melodySetupPanel.setAttribute('aria-label', copy.melodySetupLabelDesktop);
  dom.sessionToolsPanel.setAttribute('aria-label', copy.sessionToolsLabelDesktop);
  dom.melodySelectorContainer.dataset.sectionHint = melodySelectionCopy.sectionHint;
  dom.melodySelectorContainer.title = melodySelectionCopy.sectionHint;
  dom.melodySelectorContainer.setAttribute('aria-label', melodySelectionCopy.ariaLabel);
  dom.melodyLibraryHelpBtn.setAttribute('title', melodySelectionCopy.helpAriaLabel);
  dom.melodyLibraryHelpBtn.setAttribute('aria-label', melodySelectionCopy.helpAriaLabel);
}

export function renderTrainingModeFieldVisibilityView({
  visibility,
  trainingModeCopy,
}: TrainingModeFieldVisibilityViewState) {
  dom.melodySelectorContainer.classList.toggle('hidden', !visibility.showMelodySelector);
  dom.melodySelectorContainer.style.display = visibility.showMelodySelector ? 'flex' : 'none';
  dom.scaleSelectorContainer.classList.toggle('hidden', !visibility.showScaleSelector);
  dom.chordSelectorContainer.classList.toggle('hidden', !visibility.showChordSelector);
  dom.progressionSelectorContainer.classList.toggle('hidden', !visibility.showProgressionSelector);
  dom.arpeggioPatternContainer.classList.toggle('hidden', !visibility.showArpeggioPatternSelector);
  dom.volumeSection.classList.toggle('hidden', !visibility.showFretboardMonitoring);
  dom.tunerSection.classList.toggle('hidden', !visibility.showFretboardMonitoring);
  dom.metronomeQuickControls.classList.add('hidden');
  dom.trainingModeField.dataset.fieldHint =
    visibility.helperText.length > 0
      ? `${trainingModeCopy.fieldHintPrefix}. ${visibility.helperText}`
      : trainingModeCopy.fieldHintPrefix;
  dom.modeHelpText.textContent = visibility.helperText;
  dom.modeHelpText.classList.add('hidden');
  dom.modeHelpText.setAttribute('aria-hidden', 'true');
}

export function renderTrainingModeWorkflowOptionsView(workflow: UiWorkflow) {
  const workflowOnlyOptions = ['melody', 'practice', 'performance', 'rhythm'];
  workflowOnlyOptions.forEach((value) => {
    const option = dom.trainingMode.querySelector(`option[value="${value}"]`) as HTMLOptionElement | null;
    if (!option) return;
    const shouldHide = workflow === 'learn-notes';
    option.hidden = shouldHide;
    option.disabled = shouldHide;
    option.style.display = shouldHide ? 'none' : '';
  });
}

export function renderPracticeSetupModeVisibilityView(
  layout: WorkflowLayout,
  summaryText: string,
  setPanelToggleVisualState: ToggleVisualStateRenderer
) {
  dom.practiceSetupToggleBtn.classList.add('hidden');
  dom.practiceSetupSummary.style.display = !layout.showPracticeSetup || summaryText.length === 0 ? 'none' : '';
  if (!layout.showPracticeSetup) {
    dom.practiceSetupPanel.classList.add('hidden');
    dom.practiceSetupPanel.style.display = 'none';
    dom.practiceSetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.practiceSetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.practiceSetupToggleBtn, false);
    return;
  }

  dom.practiceSetupPanel.classList.remove('hidden');
  dom.practiceSetupPanel.style.display = 'flex';
  dom.practiceSetupToggleBtn.setAttribute('aria-expanded', 'true');
  dom.practiceSetupChevron.textContent = 'v';
  setPanelToggleVisualState(dom.practiceSetupToggleBtn, false);
}

export function renderMelodySetupModeVisibilityView(
  layout: WorkflowLayout,
  summaryText: string,
  setPanelToggleVisualState: ToggleVisualStateRenderer
) {
  const showMelodySetup =
    layout.showMelodySetup &&
    (layout.showMelodyActionControls || layout.showMelodyPracticeControls || layout.showEditingToolsControls);
  dom.melodySetupToggleBtn.classList.add('hidden');
  dom.melodySetupSummary.style.display = !showMelodySetup || summaryText.length === 0 ? 'none' : '';
  if (!showMelodySetup) {
    dom.melodySetupPanel.classList.add('hidden');
    dom.melodySetupPanel.style.display = 'none';
    dom.melodySetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.melodySetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.melodySetupToggleBtn, false);
  } else {
    dom.melodySetupPanel.classList.remove('hidden');
    dom.melodySetupPanel.style.display = 'flex';
    dom.melodySetupToggleBtn.setAttribute('aria-expanded', 'true');
    dom.melodySetupChevron.textContent = 'v';
    setPanelToggleVisualState(dom.melodySetupToggleBtn, false);
  }

  dom.melodyLibrarySection.classList.toggle('hidden', !layout.showMelodyActionControls);
  dom.melodyLibrarySection.hidden = !layout.showMelodyActionControls;
  dom.melodyLibrarySection.style.display = layout.showMelodyActionControls ? '' : 'none';

  if (!layout.showMelodyPracticeControls) {
    dom.melodyPracticeSection.classList.add('hidden');
    dom.melodyPracticeSection.style.setProperty('display', 'none', 'important');
    dom.melodyPracticeSection.hidden = true;
    dom.melodyPracticeFieldsRow.style.setProperty('display', 'none', 'important');
    dom.melodyPracticeActionsRow.style.setProperty('display', 'none', 'important');
    dom.melodyPracticeFieldsRow.hidden = true;
    dom.melodyPracticeActionsRow.hidden = true;
  } else {
    dom.melodyPracticeSection.hidden = false;
    dom.melodyPracticeSection.style.removeProperty('display');
    dom.melodyPracticeFieldsRow.hidden = false;
    dom.melodyPracticeActionsRow.hidden = false;
    dom.melodyPracticeFieldsRow.style.removeProperty('display');
    dom.melodyPracticeActionsRow.style.removeProperty('display');
  }

  if (!layout.showEditingToolsControls) {
    dom.editingToolsSection.classList.add('hidden');
    dom.editingToolsSection.style.setProperty('display', 'none', 'important');
    dom.editingToolsSection.hidden = true;
    dom.editingToolsFieldsRow.style.setProperty('display', 'none', 'important');
    dom.editingToolsActionsRow.style.setProperty('display', 'none', 'important');
    dom.editingToolsFieldsRow.hidden = true;
    dom.editingToolsActionsRow.hidden = true;
  } else {
    dom.editingToolsSection.hidden = false;
    dom.editingToolsSection.style.removeProperty('display');
    dom.editingToolsFieldsRow.hidden = false;
    dom.editingToolsActionsRow.hidden = false;
    dom.editingToolsFieldsRow.style.removeProperty('display');
    dom.editingToolsActionsRow.style.removeProperty('display');
  }
}

export function renderSessionToolsModeVisibilityView(
  layout: WorkflowLayout,
  summaryText: string,
  showStringSelector: boolean,
  setPanelToggleVisualState: ToggleVisualStateRenderer
) {
  const visibility = layout.sessionTools;
  const hideSessionTools = !layout.showSessionTools || !layout.showSessionToolsContent;
  dom.sessionToolsToggleBtn.classList.add('hidden');
  dom.sessionToolsSummary.style.display = hideSessionTools || summaryText.length === 0 ? 'none' : '';
  if (hideSessionTools) {
    dom.sessionToolsPanel.classList.add('hidden');
    dom.sessionToolsPanel.style.display = 'none';
    dom.sessionToolsToggleBtn.setAttribute('aria-expanded', 'false');
    dom.sessionToolsChevron.textContent = '>';
    setPanelToggleVisualState(dom.sessionToolsToggleBtn, false);
  } else {
    dom.sessionToolsPanel.classList.remove('hidden');
    dom.sessionToolsPanel.style.display = 'flex';
    dom.sessionToolsToggleBtn.setAttribute('aria-expanded', 'true');
    dom.sessionToolsChevron.textContent = 'v';
    setPanelToggleVisualState(dom.sessionToolsToggleBtn, false);
  }

  dom.sessionToolsPlanSection.classList.toggle('hidden', !visibility.showPlanSection);
  dom.sessionToolsPlanSection.hidden = !visibility.showPlanSection;
  dom.sessionToolsPlanSection.style.display = visibility.showPlanSection ? '' : 'none';
  dom.sessionToolsDisplaySection.classList.toggle('hidden', !visibility.showDisplaySection);
  dom.sessionToolsDisplaySection.hidden = !visibility.showDisplaySection;
  dom.sessionToolsDisplaySection.style.display = visibility.showDisplaySection ? '' : 'none';
  dom.sessionToolsActiveStringsSection.classList.toggle('hidden', !visibility.showActiveStringsSection);
  dom.sessionToolsActiveStringsSection.hidden = !visibility.showActiveStringsSection;
  dom.sessionToolsActiveStringsSection.style.display = visibility.showActiveStringsSection ? '' : 'none';
  dom.sessionToolsShowAllNotesRow.classList.toggle('hidden', !visibility.showShowAllNotesRow);
  dom.sessionToolsShowAllNotesRow.hidden = !visibility.showShowAllNotesRow;
  dom.sessionToolsShowAllNotesRow.style.display = visibility.showShowAllNotesRow ? '' : 'none';
  dom.sessionToolsShowStringTogglesRow.classList.toggle('hidden', !visibility.showShowStringTogglesRow);
  dom.sessionToolsShowStringTogglesRow.hidden = !visibility.showShowStringTogglesRow;
  dom.sessionToolsShowStringTogglesRow.style.display = visibility.showShowStringTogglesRow ? '' : 'none';
  dom.sessionToolsAutoPlayPromptSoundRow.classList.toggle('hidden', !visibility.showAutoPlayPromptSoundRow);
  dom.sessionToolsAutoPlayPromptSoundRow.hidden = !visibility.showAutoPlayPromptSoundRow;
  dom.sessionToolsAutoPlayPromptSoundRow.style.display = visibility.showAutoPlayPromptSoundRow ? '' : 'none';
  dom.sessionToolsRelaxPerformanceOctaveRow.classList.toggle('hidden', !visibility.showRelaxPerformanceOctaveRow);
  dom.sessionToolsRelaxPerformanceOctaveRow.hidden = !visibility.showRelaxPerformanceOctaveRow;
  dom.sessionToolsRelaxPerformanceOctaveRow.style.display = visibility.showRelaxPerformanceOctaveRow ? '' : 'none';
  dom.sessionToolsPitchMatchRow.classList.toggle('hidden', !visibility.showPitchMatchRow);
  dom.sessionToolsPitchMatchRow.hidden = !visibility.showPitchMatchRow;
  dom.sessionToolsPitchMatchRow.style.display = visibility.showPitchMatchRow ? '' : 'none';
  dom.sessionToolsTimingWindowRow.classList.toggle('hidden', !visibility.showTimingWindowRow);
  dom.sessionToolsTimingWindowRow.hidden = !visibility.showTimingWindowRow;
  dom.sessionToolsTimingWindowRow.style.display = visibility.showTimingWindowRow ? '' : 'none';
  dom.sessionToolsMicLatencyRow.classList.toggle('hidden', !visibility.showMicLatencyRow);
  dom.sessionToolsMicLatencyRow.hidden = !visibility.showMicLatencyRow;
  dom.sessionToolsMicLatencyRow.style.display = visibility.showMicLatencyRow ? '' : 'none';
  dom.sessionToolsPrimaryControls.classList.toggle('opacity-80', visibility.dimPrimaryControls);
  dom.stringSelector.hidden = !showStringSelector;
  dom.stringSelector.classList.toggle('hidden', !showStringSelector);
  dom.stringSelector.style.display = showStringSelector ? '' : 'none';
}

export function renderPlaybackControlsModeVisibilityView(
  layout: WorkflowLayout,
  visibility: TrainingModeUiVisibility,
  workflow: UiWorkflow
) {
  const showPlaybackControls = layout.showPlaybackControls && visibility.showMelodySelector;
  const showStudyMelodyMicTuning = showPlaybackControls && workflow === 'study-melody';
  dom.melodyWorkspaceTransportSection.classList.toggle('hidden', !showPlaybackControls);
  dom.melodyWorkspaceTransportSection.style.display = showPlaybackControls ? 'flex' : 'none';
  dom.melodyPlaybackControls.classList.toggle('hidden', !showPlaybackControls);
  dom.melodyDemoQuickControls.classList.toggle('hidden', !showPlaybackControls || !layout.showPlaybackQuickControls);
  dom.studyMelodyMicTuningHost.classList.toggle('hidden', !showStudyMelodyMicTuning);
  dom.studyMelodyMicTuningHost.style.display = showStudyMelodyMicTuning ? 'flex' : 'none';
  if (!showStudyMelodyMicTuning) {
    dom.studyMelodyMicTuningPanel.classList.add('hidden');
    dom.studyMelodyMicTuningPanel.style.display = 'none';
    dom.studyMelodyMicTuningToggleBtn.setAttribute('aria-expanded', 'false');
  }
}

export function renderDisplayControlsModeVisibilityView(
  layout: WorkflowLayout,
  expanded: boolean,
  setPanelToggleVisualState: ToggleVisualStateRenderer
) {
  const showExpandedPanel = layout.showDisplayControls && expanded;
  dom.layoutControlsHost.classList.toggle('hidden', !layout.showDisplayControls);
  dom.layoutControlsHost.style.display = layout.showDisplayControls ? 'flex' : 'none';
  dom.layoutToggleBtn.setAttribute('aria-expanded', String(showExpandedPanel));
  setPanelToggleVisualState(dom.layoutToggleBtn, showExpandedPanel);
  dom.melodyDisplayControlsSection.classList.toggle('hidden', !showExpandedPanel);
  dom.melodyDisplayControlsSection.style.display = showExpandedPanel ? 'flex' : 'none';
  dom.melodyDisplayControls.classList.toggle('hidden', !showExpandedPanel || !layout.showMelodyDisplayControls);
  dom.melodyShowNoteChip.classList.toggle('hidden', !layout.showMelodyNoteHintDisplayControl);
  dom.layoutDisplayDivider.classList.toggle('hidden', !layout.showMelodyDisplayControls || !layout.showAnyZoomControl);
  dom.layoutZoomControls.classList.toggle('hidden', !layout.showAnyZoomControl);
  dom.melodyTimelineZoomControl.classList.toggle('hidden', !layout.showTimelineZoomControl);
  dom.scrollingTabZoomControl.classList.toggle('hidden', !layout.showScrollingZoomControl);
}
