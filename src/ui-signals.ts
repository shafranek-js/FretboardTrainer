import { dom } from './state';
import { createSignal } from './reactive/signal';
import { CENTS_TOLERANCE, CENTS_VISUAL_RANGE } from './constants';
import { computeTunerView } from './tuner-view';
import { getTrainingModeUiVisibility } from './training-mode-ui';
import type { UiWorkflow } from './training-workflows';
import type { UiMode } from './ui-mode';
import type { LastSessionHeatmapView, LastSessionViewModel, StatsViewModel } from './stats-view';
import { formatMusicText } from './note-display';
import { resolveWorkflowLayout } from './workflow-layout';
import { getMelodySelectionSectionCopy, getTrainingModeFieldCopy, getWorkflowUiCopy } from './workflow-ui-copy';

const statusTextSignal = createSignal('Ready');
const promptTextSignal = createSignal('');
type ResultTone = 'neutral' | 'success' | 'error';
interface ResultViewState {
  text: string;
  tone: ResultTone;
}
const resultViewSignal = createSignal<ResultViewState>({ text: '', tone: 'neutral' });
const volumeLevelSignal = createSignal(0);
const statsViewSignal = createSignal<StatsViewModel>({
  highScoreText: '0',
  accuracyText: '0.0%',
  avgTimeText: '0.00s',
  problemNotes: [],
  lastSession: null,
});
const sessionSummaryViewSignal = createSignal<LastSessionViewModel | null>(null);
const timerValueSignal = createSignal('60');
const scoreValueSignal = createSignal('0');
const timedInfoVisibleSignal = createSignal(false);
const sessionGoalProgressSignal = createSignal('');
const practiceSetupCollapsedSignal = createSignal(false);
const melodySetupCollapsedSignal = createSignal(false);
const sessionToolsCollapsedSignal = createSignal(true);
const layoutControlsExpandedSignal = createSignal(false);
const practiceSetupSummarySignal = createSignal('');
const melodySetupSummarySignal = createSignal('');
const sessionToolsSummarySignal = createSignal('');
interface SessionButtonsState {
  startDisabled: boolean;
  stopDisabled: boolean;
  hintDisabled: boolean;
  playSoundDisabled: boolean;
}
const defaultSessionButtonsState: SessionButtonsState = {
  startDisabled: false,
  stopDisabled: true,
  hintDisabled: true,
  playSoundDisabled: true,
};
const sessionButtonsSignal = createSignal<SessionButtonsState>(defaultSessionButtonsState);
const tunerVisibleSignal = createSignal(false);
interface TunerReadingState {
  frequency: number | null;
  targetFrequency: number | null;
}
const tunerReadingSignal = createSignal<TunerReadingState>({
  frequency: null,
  targetFrequency: null,
});
const trainingModeUiSignal = createSignal('random');
const uiWorkflowSignal = createSignal<UiWorkflow>('learn-notes');
const uiModeSignal = createSignal<UiMode>('simple');
interface LoadingViewState {
  isLoading: boolean;
  message: string;
}
const loadingViewSignal = createSignal<LoadingViewState>({
  isLoading: false,
  message: '',
});
type ModalKey =
  | 'onboarding'
  | 'settings'
  | 'userData'
  | 'help'
  | 'quickHelp'
  | 'sessionSummary'
  | 'stats'
  | 'guide'
  | 'links'
  | 'profileName'
  | 'melodyImport';
type ModalVisibilityState = Record<ModalKey, boolean>;
const modalVisibilitySignal = createSignal<ModalVisibilityState>({
  onboarding: false,
  settings: false,
  userData: false,
  help: false,
  quickHelp: false,
  sessionSummary: false,
  stats: false,
  guide: false,
  links: false,
  profileName: false,
  melodyImport: false,
});
interface ProfileActionsState {
  updateDisabled: boolean;
  deleteDisabled: boolean;
}
const profileActionsSignal = createSignal<ProfileActionsState>({
  updateDisabled: true,
  deleteDisabled: true,
});
interface CalibrationViewState {
  isVisible: boolean;
  progressPercent: number;
  statusText: string;
}
const calibrationViewSignal = createSignal<CalibrationViewState>({
  isVisible: false,
  progressPercent: 0,
  statusText: 'Listening...',
});
interface InfoSlotsState {
  slot1: string;
  slot2: string;
  slot3: string;
}
const infoSlotsSignal = createSignal<InfoSlotsState>({ slot1: '', slot2: '', slot3: '' });
let isBound = false;
let previousSessionActive = false;
let wasAutoCollapsedForSession = false;
let wasAutoCollapsedMelodySetupForSession = false;
let wasAutoCollapsedSessionToolsForSession = false;

function resolveCurrentWorkflowLayout(mode: string, workflow: UiWorkflow) {
  return resolveWorkflowLayout({
    workflow,
    trainingMode: mode,
    showTabTimeline: dom.melodyShowTabTimeline.checked,
    showScrollingTab: dom.melodyShowScrollingTab.checked,
  });
}

function renderPromptText(promptText: string) {
  dom.prompt.textContent = formatMusicText(promptText);
}

function renderResultView(resultView: ResultViewState) {
  dom.result.textContent = formatMusicText(resultView.text);
  dom.result.classList.remove('text-green-400', 'text-red-400');
  if (resultView.tone === 'success') {
    dom.result.classList.add('text-green-400');
  } else if (resultView.tone === 'error') {
    dom.result.classList.add('text-red-400');
  }
  syncSessionInlineFeedbackDividerVisibility();
}

function renderInfoSlots({ slot1, slot2, slot3 }: InfoSlotsState) {
  dom.infoSlot1.textContent = formatMusicText(slot1);
  dom.infoSlot2.textContent = formatMusicText(slot2);
  dom.infoSlot3.textContent = formatMusicText(slot3);
  syncSessionInlineFeedbackDividerVisibility();
}

function syncSessionInlineFeedbackDividerVisibility() {
  const hasResultText = (dom.result.textContent?.trim().length ?? 0) > 0;
  const hasInfoText = [
    dom.infoSlot1.textContent,
    dom.infoSlot2.textContent,
    dom.infoSlot3.textContent,
  ].some((text) => (text?.trim().length ?? 0) > 0);
  const hasAnyText = hasResultText || hasInfoText;

  // Show the divider only when both sides have content.
  dom.sessionInlineDivider.classList.toggle('hidden', !hasResultText || !hasInfoText);
  dom.sessionInlineFeedback.classList.toggle('opacity-60', !hasAnyText);
}

function setPanelToggleVisualState(button: HTMLButtonElement, expanded: boolean) {
  button.classList.toggle('bg-slate-700', expanded);
  button.classList.toggle('text-white', expanded);
  button.classList.toggle('shadow-inner', expanded);
  button.classList.toggle('shadow-black/20', expanded);
  button.classList.toggle('bg-transparent', !expanded);
  button.classList.toggle('text-slate-300', !expanded);
  button.classList.toggle('hover:bg-slate-800/70', !expanded);
}

function setWorkflowButtonVisualState(button: HTMLButtonElement, active: boolean) {
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('border-cyan-400/80', active);
  button.classList.toggle('bg-cyan-600', active);
  button.classList.toggle('text-white', active);
  button.classList.toggle('shadow-inner', active);
  button.classList.toggle('shadow-black/20', active);
  button.classList.toggle('border-slate-500/80', !active);
  button.classList.toggle('bg-slate-800/70', !active);
  button.classList.toggle('text-slate-200', !active);
}

function renderWorkflowSwitcher(workflow: UiWorkflow) {
  setWorkflowButtonVisualState(dom.workflowLearnNotesBtn, workflow === 'learn-notes');
  setWorkflowButtonVisualState(dom.workflowStudyMelodyBtn, workflow === 'study-melody');
  setWorkflowButtonVisualState(dom.workflowPracticeBtn, workflow === 'practice');
  setWorkflowButtonVisualState(dom.workflowPerformBtn, workflow === 'perform');
  setWorkflowButtonVisualState(dom.workflowLibraryBtn, workflow === 'library');
  setWorkflowButtonVisualState(dom.workflowEditorBtn, workflow === 'editor');
}

function renderUiModeSwitcher(uiMode: UiMode) {
  setWorkflowButtonVisualState(dom.uiModeSimpleBtn, uiMode === 'simple');
  setWorkflowButtonVisualState(dom.uiModeAdvancedBtn, uiMode === 'advanced');
}

function renderUiModeVisibility(uiMode: UiMode) {
  const isAdvanced = uiMode === 'advanced';
  const showTrainingModeField = uiWorkflowSignal.get() === 'learn-notes';
  dom.trainingModeField.classList.toggle('hidden', !showTrainingModeField);
  dom.micAttackFilterRow.classList.toggle('hidden', !isAdvanced);
  dom.micHoldFilterRow.classList.toggle('hidden', !isAdvanced);
  dom.micPolyphonicDetectorRow.classList.toggle('hidden', !isAdvanced);
  dom.performanceMicLatencyCompensationExact.classList.toggle('hidden', !isAdvanced);
  dom.micPolyphonicActionsRow.classList.toggle('hidden', !isAdvanced);
  dom.micPolyphonicBenchmarkInfo.classList.toggle('hidden', !isAdvanced);
  dom.micNoiseGateInfo.classList.toggle('hidden', !isAdvanced);
}

function renderTrainingModeWorkflowOptions(workflow: UiWorkflow) {
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

function renderPracticeSetupCollapsed(collapsed: boolean) {
  dom.practiceSetupPanel.classList.toggle('hidden', collapsed);
  dom.practiceSetupPanel.style.display = collapsed ? 'none' : 'flex';
  dom.practiceSetupToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.practiceSetupChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.practiceSetupToggleBtn, !collapsed);
}

function renderPracticeSetupModeVisibility(workflow: UiWorkflow) {
  const layout = resolveCurrentWorkflowLayout(trainingModeUiSignal.get(), workflow);
  dom.practiceSetupToggleBtn.classList.add('hidden');
  dom.practiceSetupSummary.style.display =
    !layout.showPracticeSetup || practiceSetupSummarySignal.get().length === 0 ? 'none' : '';
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

function renderMelodySetupCollapsed(collapsed: boolean) {
  if (dom.melodySetupToggleBtn.classList.contains('hidden')) {
    dom.melodySetupPanel.classList.add('hidden');
    dom.melodySetupPanel.style.display = 'none';
    dom.melodySetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.melodySetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.melodySetupToggleBtn, false);
    return;
  }
  dom.melodySetupPanel.classList.toggle('hidden', collapsed);
  dom.melodySetupPanel.style.display = collapsed ? 'none' : 'flex';
  dom.melodySetupToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.melodySetupChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.melodySetupToggleBtn, !collapsed);
}

function renderSessionToolsCollapsed(collapsed: boolean) {
  if (dom.sessionToolsToggleBtn.classList.contains('hidden')) {
    dom.sessionToolsPanel.classList.add('hidden');
    dom.sessionToolsPanel.style.display = 'none';
    dom.sessionToolsToggleBtn.setAttribute('aria-expanded', 'false');
    dom.sessionToolsChevron.textContent = '>';
    setPanelToggleVisualState(dom.sessionToolsToggleBtn, false);
    return;
  }
  dom.sessionToolsPanel.classList.toggle('hidden', collapsed);
  dom.sessionToolsPanel.style.display = collapsed ? 'none' : 'flex';
  dom.sessionToolsToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.sessionToolsChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.sessionToolsToggleBtn, !collapsed);
}

function renderSessionToolsModeVisibility(mode: string, workflow: UiWorkflow) {
  const layout = resolveCurrentWorkflowLayout(mode, workflow);
  const visibility = layout.sessionTools;
  const hideSessionTools = !layout.showSessionTools || !layout.showSessionToolsContent;
  dom.sessionToolsToggleBtn.classList.add('hidden');
  dom.sessionToolsSummary.style.display =
    hideSessionTools || sessionToolsSummarySignal.get().length === 0 ? 'none' : '';
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
  dom.sessionToolsRelaxPerformanceOctaveRow.classList.toggle(
    'hidden',
    !visibility.showRelaxPerformanceOctaveRow
  );
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
  const showStringSelector = visibility.showShowStringTogglesRow && dom.showStringToggles.checked;
  dom.stringSelector.classList.toggle('hidden', !showStringSelector);
  dom.stringSelector.style.display = showStringSelector ? '' : 'none';
}

function renderMelodySetupModeVisibility(mode: string, workflow: UiWorkflow) {
  const layout = resolveCurrentWorkflowLayout(mode, workflow);
  const showMelodySetup =
    layout.showMelodySetup &&
    (layout.showMelodyActionControls ||
      layout.showMelodyPracticeControls ||
      layout.showEditingToolsControls);
  dom.melodySetupToggleBtn.classList.add('hidden');
  dom.melodySetupSummary.style.display =
    !showMelodySetup || melodySetupSummarySignal.get().length === 0 ? 'none' : '';
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

function renderPlaybackControlsModeVisibility(mode: string, workflow: UiWorkflow) {
  const visibility = getTrainingModeUiVisibility(mode);
  const layout = resolveCurrentWorkflowLayout(mode, workflow);
  const showPlaybackControls = layout.showPlaybackControls && visibility.showMelodySelector;
  dom.melodyWorkspaceTransportSection.classList.toggle('hidden', !showPlaybackControls);
  dom.melodyWorkspaceTransportSection.style.display = showPlaybackControls ? 'flex' : 'none';
  dom.melodyPlaybackControls.classList.toggle('hidden', !showPlaybackControls);
  dom.melodyDemoQuickControls.classList.toggle(
    'hidden',
    !showPlaybackControls || !layout.showPlaybackQuickControls
  );
}

function renderDisplayControlsModeVisibility(mode: string, workflow: UiWorkflow) {
  const layout = resolveCurrentWorkflowLayout(mode, workflow);
  const showExpandedPanel = layout.showDisplayControls && layoutControlsExpandedSignal.get();
  dom.layoutControlsHost.classList.toggle('hidden', !layout.showDisplayControls);
  dom.layoutControlsHost.style.display = layout.showDisplayControls ? 'flex' : 'none';
  dom.layoutToggleBtn.setAttribute('aria-expanded', String(showExpandedPanel));
  setPanelToggleVisualState(dom.layoutToggleBtn, showExpandedPanel);
  dom.melodyDisplayControlsSection.classList.toggle('hidden', !showExpandedPanel);
  dom.melodyDisplayControlsSection.style.display = showExpandedPanel ? 'flex' : 'none';
  dom.melodyDisplayControls.classList.toggle(
    'hidden',
    !showExpandedPanel || !layout.showMelodyDisplayControls
  );
  dom.melodyShowNoteChip.classList.toggle('hidden', !layout.showMelodyNoteHintDisplayControl);
  dom.layoutDisplayDivider.classList.toggle(
    'hidden',
    !layout.showMelodyDisplayControls || !layout.showAnyZoomControl
  );
  dom.layoutZoomControls.classList.toggle('hidden', !layout.showAnyZoomControl);
  dom.melodyTimelineZoomControl.classList.toggle('hidden', !layout.showTimelineZoomControl);
  dom.scrollingTabZoomControl.classList.toggle('hidden', !layout.showScrollingZoomControl);
}

function renderPracticeSetupSummary(summaryText: string) {
  dom.practiceSetupSummary.textContent = summaryText;
  dom.practiceSetupSummary.title = summaryText;
  dom.practiceSetupSummary.removeAttribute('title');
  dom.practiceSetupToggleBtn.dataset.summaryTooltip = summaryText;
  dom.practiceSetupPanel.dataset.summaryTooltip = summaryText;
  dom.practiceSetupToggleBtn.removeAttribute('title');
  dom.practiceSetupPanel.removeAttribute('title');
}

function renderMelodySetupSummary(summaryText: string) {
  dom.melodySetupSummary.textContent = summaryText;
  dom.melodySetupSummary.title = summaryText;
  dom.melodySetupSummary.removeAttribute('title');
  dom.melodySetupToggleBtn.dataset.summaryTooltip = summaryText;
  dom.melodySetupPanel.dataset.summaryTooltip = summaryText;
  dom.melodySetupToggleBtn.removeAttribute('title');
  dom.melodySetupPanel.removeAttribute('title');
  dom.melodySetupSummary.style.display =
    dom.melodySetupToggleBtn.classList.contains('hidden') || summaryText.length === 0 ? 'none' : '';
}

function renderSessionToolsSummary(summaryText: string) {
  dom.sessionToolsSummary.textContent = summaryText;
  dom.sessionToolsSummary.title = summaryText;
  dom.sessionToolsSummary.removeAttribute('title');
  dom.sessionToolsToggleBtn.dataset.summaryTooltip = summaryText;
  dom.sessionToolsPanel.dataset.summaryTooltip = summaryText;
  dom.sessionToolsToggleBtn.removeAttribute('title');
  dom.sessionToolsPanel.removeAttribute('title');
  dom.sessionToolsSummary.style.display =
    dom.sessionToolsToggleBtn.classList.contains('hidden') || summaryText.length === 0 ? 'none' : '';
}

function createHeatmapCellColor(intensity: number, hasErrors: boolean) {
  if (!hasErrors) return 'rgba(30, 41, 59, 0.55)'; // slate-800-ish
  const alpha = 0.2 + Math.max(0, Math.min(1, intensity)) * 0.75;
  return `rgba(239, 68, 68, ${alpha})`; // red-500 ramp
}

function renderLastSessionHeatmap(heatmap: LastSessionHeatmapView | null) {
  if (!heatmap) {
    dom.statsLastSessionHeatmap.innerHTML =
      '<div class="text-center text-xs text-slate-400">Heatmap appears after string-specific note practice.</div>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'inline-grid gap-1 min-w-max';
  wrapper.style.gridTemplateColumns = `auto repeat(${heatmap.frets.length}, minmax(22px, 1fr))`;

  const corner = document.createElement('div');
  corner.className = 'w-8 h-6';
  wrapper.appendChild(corner);

  for (const fret of heatmap.frets) {
    const headerCell = document.createElement('div');
    headerCell.className =
      'h-6 min-w-[22px] text-[10px] leading-6 text-center text-slate-400 font-semibold';
    headerCell.textContent = String(fret);
    wrapper.appendChild(headerCell);
  }

  for (const stringName of heatmap.strings) {
    const rowLabel = document.createElement('div');
    rowLabel.className =
      'w-8 h-6 text-[10px] leading-6 text-right pr-1 text-slate-300 font-semibold';
    rowLabel.textContent = stringName;
    wrapper.appendChild(rowLabel);

    for (const fret of heatmap.frets) {
      const key = `${stringName}:${fret}`;
      const cell = heatmap.cells[key];
      const incorrect = cell?.incorrect ?? 0;
      const attempts = cell?.attempts ?? 0;
      const hasErrors = incorrect > 0;

      const heatCell = document.createElement('div');
      heatCell.className =
        'w-[22px] h-[22px] rounded-[4px] border border-slate-600/80 flex items-center justify-center text-[9px] font-semibold';
      heatCell.style.backgroundColor = createHeatmapCellColor(cell?.intensity ?? 0, hasErrors);
      heatCell.style.color = hasErrors ? '#fee2e2' : attempts > 0 ? '#cbd5e1' : '#64748b';
      heatCell.textContent = attempts > 0 ? String(incorrect) : '';

      if (cell) {
        const accuracyPercent = (cell.accuracy * 100).toFixed(0);
        heatCell.title = `${stringName} string, fret ${fret}: ${cell.correct}/${cell.attempts} correct (${accuracyPercent}% accuracy)`;
      } else {
        heatCell.title = `${stringName} string, fret ${fret}: not targeted in last session`;
      }

      wrapper.appendChild(heatCell);
    }
  }

  dom.statsLastSessionHeatmap.innerHTML = '';
  dom.statsLastSessionHeatmap.appendChild(wrapper);

  const legend = document.createElement('div');
  legend.className = 'mt-2 text-[10px] text-slate-400 text-center';
  legend.textContent =
    heatmap.maxIncorrect > 0
      ? `Cell number = wrong attempts for that target position (max ${heatmap.maxIncorrect}).`
      : 'No mistakes in targeted string-specific positions for the last session.';
  dom.statsLastSessionHeatmap.appendChild(legend);
}

function renderStatsView(statsView: StatsViewModel) {
  dom.statsHighScore.textContent = statsView.highScoreText;
  dom.statsAccuracy.textContent = statsView.accuracyText;
  dom.statsAvgTime.textContent = statsView.avgTimeText;
  dom.repeatLastSessionBtn.disabled = !statsView.lastSession;

  dom.statsProblemNotes.innerHTML = '';
  if (statsView.problemNotes.length > 0) {
    statsView.problemNotes.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'bg-slate-600 p-2 rounded';
      li.textContent = formatMusicText(
        `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
      );
      dom.statsProblemNotes.appendChild(li);
    });
  } else {
    dom.statsProblemNotes.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No data yet. Play a few rounds!</li>';
  }

  if (statsView.lastSession) {
    dom.statsLastSessionSection.classList.remove('hidden');
    dom.statsLastSessionMode.textContent = formatMusicText(statsView.lastSession.modeLabel);
    dom.statsLastSessionInput.textContent = statsView.lastSession.inputText;
    dom.statsLastSessionInput.title = statsView.lastSession.inputText;
    dom.statsLastSessionDuration.textContent = statsView.lastSession.durationText;
    dom.statsLastSessionAttempts.textContent = statsView.lastSession.attemptsText;
    dom.statsLastSessionAccuracy.textContent = statsView.lastSession.accuracyText;
    dom.statsLastSessionAvgTime.textContent = statsView.lastSession.avgTimeText;
    dom.statsLastSessionBestStreak.textContent = statsView.lastSession.bestStreakText;
    dom.statsLastSessionStarsCard.classList.toggle('hidden', !statsView.lastSession.starsText);
    dom.statsLastSessionStars.textContent = statsView.lastSession.starsText ?? '-';
    dom.statsLastSessionStarsDetail.textContent = statsView.lastSession.starsDetailText ?? '';
    dom.statsLastSessionCoachTip.textContent = formatMusicText(statsView.lastSession.coachTipText ?? '');

    dom.statsLastSessionWeakSpots.innerHTML = '';
    if (statsView.lastSession.weakSpots.length > 0) {
      statsView.lastSession.weakSpots.forEach((note) => {
        const li = document.createElement('li');
        li.className = 'bg-slate-600 p-2 rounded';
        li.textContent = formatMusicText(
          `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
        );
        dom.statsLastSessionWeakSpots.appendChild(li);
      });
    } else {
      dom.statsLastSessionWeakSpots.innerHTML =
        '<li class="bg-slate-600 p-2 rounded">No graded note attempts in the last session.</li>';
    }

    if (statsView.lastSession.rhythmSummary) {
      dom.statsLastSessionRhythmSummary.classList.remove('hidden');
      dom.statsRhythmOnBeat.textContent = statsView.lastSession.rhythmSummary.onBeatText;
      dom.statsRhythmEarly.textContent = statsView.lastSession.rhythmSummary.earlyText;
      dom.statsRhythmLate.textContent = statsView.lastSession.rhythmSummary.lateText;
      dom.statsRhythmAvgOffset.textContent = statsView.lastSession.rhythmSummary.avgOffsetText;
      dom.statsRhythmBestOffset.textContent = statsView.lastSession.rhythmSummary.bestOffsetText;
    } else {
      dom.statsLastSessionRhythmSummary.classList.add('hidden');
    }
    renderLastSessionHeatmap(statsView.lastSession.heatmap);
  } else {
    dom.statsLastSessionSection.classList.add('hidden');
    dom.statsLastSessionRhythmSummary.classList.add('hidden');
    dom.statsLastSessionStarsCard.classList.add('hidden');
  }
}

function renderSessionSummaryView(sessionSummary: LastSessionViewModel | null) {
  if (!sessionSummary) {
    dom.sessionSummaryMode.textContent = '-';
    dom.sessionSummaryInput.textContent = '-';
    dom.sessionSummaryDuration.textContent = '-';
    dom.sessionSummaryAccuracy.textContent = '-';
    dom.sessionSummaryOverallScoreLabel.textContent = 'Overall Score';
    dom.sessionSummaryOverallScore.textContent = '-';
    dom.sessionSummaryStarsCard.classList.add('hidden');
    dom.sessionSummaryStars.textContent = '-';
    dom.sessionSummaryStarsDetail.textContent = '-';
    dom.sessionSummaryCorrect.textContent = '-';
    dom.sessionSummaryWrong.textContent = '-';
    dom.sessionSummaryMissedNoInput.textContent = '-';
    dom.sessionSummaryTimingAccuracy.textContent = '-';
    dom.sessionSummaryTimingOffset.textContent = '-';
    dom.sessionSummaryTimingBreakdown.textContent = '-';
    dom.sessionSummaryAvgTime.textContent = '-';
    dom.sessionSummaryBestStreak.textContent = '-';
    dom.sessionSummaryCoachTip.textContent = '-';
    dom.sessionSummaryNextStep.textContent = '-';
    dom.sessionSummaryOverallScoreCard.classList.remove('hidden');
    dom.sessionSummaryWrongCard.classList.remove('hidden');
    dom.sessionSummaryMissedCard.classList.remove('hidden');
    dom.sessionSummaryTimingAccuracyCard.classList.remove('hidden');
    dom.sessionSummaryTimingOffsetCard.classList.remove('hidden');
    dom.sessionSummaryTimingBreakdownCard.classList.remove('hidden');
    dom.sessionSummaryWeakSpots.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No graded note attempts in the last session.</li>';
    return;
  }

  dom.sessionSummaryMode.textContent = formatMusicText(sessionSummary.modeLabel);
  dom.sessionSummaryInput.textContent = sessionSummary.inputText;
  dom.sessionSummaryInput.title = sessionSummary.inputText;
  dom.sessionSummaryDuration.textContent = sessionSummary.durationText;
  dom.sessionSummaryAccuracy.textContent = sessionSummary.accuracyText;
  dom.sessionSummaryOverallScoreLabel.textContent = sessionSummary.overallScoreLabel;
  dom.sessionSummaryOverallScore.textContent = sessionSummary.overallPerformanceScoreText;
  dom.sessionSummaryStarsCard.classList.toggle('hidden', !sessionSummary.starsText);
  dom.sessionSummaryStars.textContent = sessionSummary.starsText ?? '-';
  dom.sessionSummaryStarsDetail.textContent = sessionSummary.starsDetailText ?? '';
  dom.sessionSummaryCorrect.textContent = `${sessionSummary.correctAttemptsText} / ${sessionSummary.totalAttemptsText}`;
  dom.sessionSummaryWrong.textContent = sessionSummary.wrongAttemptsText;
  dom.sessionSummaryMissedNoInput.textContent = sessionSummary.missedNoInputAttemptsText;
  dom.sessionSummaryTimingAccuracy.textContent = sessionSummary.performanceTimingSummary?.timingAccuracyText ?? '-';
  dom.sessionSummaryTimingOffset.textContent = sessionSummary.performanceTimingSummary?.avgOffsetText ?? '-';
  dom.sessionSummaryTimingBreakdown.textContent = sessionSummary.performanceTimingSummary?.breakdownText ?? '-';
  dom.sessionSummaryOverallScoreCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryWrongCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryMissedCard.classList.toggle('hidden', !sessionSummary.showFormalPerformanceMetrics);
  dom.sessionSummaryTimingAccuracyCard.classList.toggle(
    'hidden',
    !sessionSummary.showFormalPerformanceMetrics
  );
  dom.sessionSummaryTimingOffsetCard.classList.toggle(
    'hidden',
    !sessionSummary.showFormalPerformanceMetrics
  );
  dom.sessionSummaryTimingBreakdownCard.classList.toggle(
    'hidden',
    !sessionSummary.showFormalPerformanceMetrics
  );
  dom.sessionSummaryAvgTime.textContent = sessionSummary.avgTimeText;
  dom.sessionSummaryBestStreak.textContent = sessionSummary.bestStreakText;
  dom.sessionSummaryCoachTip.textContent = formatMusicText(sessionSummary.coachTipText ?? '');
  dom.sessionSummaryNextStep.textContent = formatMusicText(sessionSummary.nextStepText ?? '');

  dom.sessionSummaryWeakSpots.innerHTML = '';
  if (sessionSummary.weakSpots.length > 0) {
    sessionSummary.weakSpots.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'bg-slate-600 p-2 rounded';
      li.textContent = formatMusicText(
        `${note.label} (Acc: ${(note.accuracy * 100).toFixed(0)}%, Time: ${note.avgTime.toFixed(2)}s)`
      );
      dom.sessionSummaryWeakSpots.appendChild(li);
    });
  } else {
    dom.sessionSummaryWeakSpots.innerHTML =
      '<li class="bg-slate-600 p-2 rounded">No graded note attempts in the last session.</li>';
  }
}

function syncSessionToggleButton() {
  const { startDisabled, stopDisabled } = sessionButtonsSignal.get();
  const { isLoading } = loadingViewSignal.get();
  const isStopMode = !stopDisabled;
  const workflowCopy = getWorkflowUiCopy(uiWorkflowSignal.get());
  const hideStartActions =
    !isStopMode && (uiWorkflowSignal.get() === 'library' || uiWorkflowSignal.get() === 'editor');

  dom.sessionToggleBtn.textContent = isStopMode ? 'Stop Session' : workflowCopy.primaryActionLabel;
  dom.sessionToggleBtn.setAttribute(
    'aria-label',
    isStopMode ? 'Stop current session' : workflowCopy.primaryActionAriaLabel
  );
  const startActionDisabled = hideStartActions ? true : startDisabled || isLoading;
  dom.sessionToggleBtn.disabled = isStopMode ? stopDisabled : startActionDisabled;
  dom.sessionToggleBtn.classList.toggle('bg-red-600', isStopMode);
  dom.sessionToggleBtn.classList.toggle('hover:bg-red-700', isStopMode);
  dom.sessionToggleBtn.classList.toggle('bg-blue-600', !isStopMode);
  dom.sessionToggleBtn.classList.toggle('hover:bg-blue-700', !isStopMode);
  dom.sessionToggleBtn.classList.toggle('hidden', hideStartActions);
  dom.startSessionHelpBtn.classList.toggle('hidden', hideStartActions);
}

function renderHintButtonVisibility(mode: string, workflow: UiWorkflow) {
  const visibility = getTrainingModeUiVisibility(mode);
  const sessionActive = !sessionButtonsSignal.get().stopDisabled;
  const showHintButton = workflow === 'learn-notes' && sessionActive && visibility.showHintButton;
  dom.hintControlsHost.classList.toggle('hidden', !showHintButton);
  dom.hintControlsHost.style.display = showHintButton ? 'flex' : 'none';
  dom.hintBtn.style.display = showHintButton ? 'inline-flex' : 'none';
}

function renderWorkflowUiCopy(workflow: UiWorkflow) {
  const copy = getWorkflowUiCopy(workflow);
  const melodySelectionCopy = getMelodySelectionSectionCopy(workflow);
  const trainingModeCopy = getTrainingModeFieldCopy(workflow);
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
  renderTrainingModeWorkflowOptions(workflow);
  renderUiModeVisibility(uiModeSignal.get());
  renderHintButtonVisibility(trainingModeUiSignal.get(), workflow);
  renderPlaybackControlsModeVisibility(trainingModeUiSignal.get(), workflow);
  renderDisplayControlsModeVisibility(trainingModeUiSignal.get(), workflow);
  syncSessionToggleButton();
}

export function bindUiSignals() {
  if (isBound) return;
  isBound = true;

  statusTextSignal.subscribe((statusText) => {
    dom.statusBar.textContent = statusText;
  });

  promptTextSignal.subscribe((promptText) => {
    renderPromptText(promptText);
  });

  resultViewSignal.subscribe((resultView) => {
    renderResultView(resultView);
  });

  volumeLevelSignal.subscribe((volumeLevel) => {
    const clampedPercent = Math.max(0, Math.min(100, volumeLevel * 500));
    dom.volumeBar.style.height = `${clampedPercent}%`;
  });

  statsViewSignal.subscribe((statsView) => {
    renderStatsView(statsView);
  });
  sessionSummaryViewSignal.subscribe((sessionSummary) => {
    renderSessionSummaryView(sessionSummary);
  });

  timerValueSignal.subscribe((timerValue) => {
    dom.timer.textContent = timerValue;
  });

  scoreValueSignal.subscribe((scoreValue) => {
    dom.score.textContent = scoreValue;
  });

  sessionButtonsSignal.subscribe(
    ({ startDisabled, stopDisabled, hintDisabled, playSoundDisabled }) => {
      dom.startBtn.disabled = startDisabled || loadingViewSignal.get().isLoading;
      dom.stopBtn.disabled = stopDisabled;
      dom.hintBtn.disabled = hintDisabled;
      dom.playSoundBtn.disabled = playSoundDisabled;

      const sessionActive = !stopDisabled;
      const isCurrentlyCollapsed = practiceSetupCollapsedSignal.get();
      const isMelodySetupCollapsed = melodySetupCollapsedSignal.get();
      const isSessionToolsCollapsed = sessionToolsCollapsedSignal.get();
      if (sessionActive && !previousSessionActive) {
        if (!isCurrentlyCollapsed) {
          wasAutoCollapsedForSession = true;
          practiceSetupCollapsedSignal.set(true);
        } else {
          wasAutoCollapsedForSession = false;
        }
        if (
          !dom.melodySetupToggleBtn.classList.contains('hidden') &&
          !isMelodySetupCollapsed
        ) {
          wasAutoCollapsedMelodySetupForSession = true;
          melodySetupCollapsedSignal.set(true);
        } else {
          wasAutoCollapsedMelodySetupForSession = false;
        }
        if (!isSessionToolsCollapsed) {
          wasAutoCollapsedSessionToolsForSession = true;
          sessionToolsCollapsedSignal.set(true);
        } else {
          wasAutoCollapsedSessionToolsForSession = false;
        }
      } else if (!sessionActive && previousSessionActive) {
        if (wasAutoCollapsedForSession) {
          practiceSetupCollapsedSignal.set(false);
        }
        if (wasAutoCollapsedMelodySetupForSession) {
          melodySetupCollapsedSignal.set(false);
        }
        if (wasAutoCollapsedSessionToolsForSession) {
          sessionToolsCollapsedSignal.set(false);
        }
        wasAutoCollapsedForSession = false;
        wasAutoCollapsedMelodySetupForSession = false;
        wasAutoCollapsedSessionToolsForSession = false;
      }
      previousSessionActive = sessionActive;

      syncSessionToggleButton();
      renderHintButtonVisibility(trainingModeUiSignal.get(), uiWorkflowSignal.get());
    }
  );

  tunerVisibleSignal.subscribe((isVisible) => {
    if (isVisible) {
      dom.tunerDisplay.classList.add('visible');
      dom.tunerDisplay.classList.remove('invisible', 'opacity-0');
    } else {
      dom.tunerDisplay.classList.remove('visible');
      dom.tunerDisplay.classList.add('invisible', 'opacity-0');
    }
  });

  tunerReadingSignal.subscribe(({ frequency, targetFrequency }) => {
    const needle = dom.tunerNeedle;
    const view = computeTunerView(frequency, targetFrequency, CENTS_TOLERANCE, CENTS_VISUAL_RANGE);

    needle.classList.remove('bg-green-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-400');
    if (view.tone === 'inTune') {
      needle.classList.add('bg-green-500');
    } else if (view.tone === 'flat') {
      needle.classList.add('bg-cyan-500');
    } else if (view.tone === 'sharp') {
      needle.classList.add('bg-red-500');
    }

    needle.style.transform = `translateX(-50%) translateY(${view.translationPercent}%)`;
    dom.tunerCents.textContent = view.centsText;
  });

  trainingModeUiSignal.subscribe((mode) => {
    const visibility = getTrainingModeUiVisibility(mode);
    const workflow = uiWorkflowSignal.get();

    dom.melodySelectorContainer.classList.toggle('hidden', !visibility.showMelodySelector);
    dom.melodySelectorContainer.style.display = visibility.showMelodySelector ? 'flex' : 'none';
    dom.scaleSelectorContainer.classList.toggle('hidden', !visibility.showScaleSelector);
    dom.chordSelectorContainer.classList.toggle('hidden', !visibility.showChordSelector);
    dom.progressionSelectorContainer.classList.toggle('hidden', !visibility.showProgressionSelector);
    dom.arpeggioPatternContainer.classList.toggle(
      'hidden',
      !visibility.showArpeggioPatternSelector
    );
    renderHintButtonVisibility(mode, workflow);
    dom.volumeSection.classList.toggle('hidden', !visibility.showFretboardMonitoring);
    dom.tunerSection.classList.toggle('hidden', !visibility.showFretboardMonitoring);
    dom.metronomeQuickControls.classList.add('hidden');
    renderPracticeSetupModeVisibility(workflow);
    renderMelodySetupModeVisibility(mode, workflow);
    renderPlaybackControlsModeVisibility(mode, workflow);
    renderDisplayControlsModeVisibility(mode, workflow);
    renderSessionToolsModeVisibility(mode, workflow);
    const trainingModeCopy = getTrainingModeFieldCopy(workflow);
    dom.trainingModeField.dataset.fieldHint =
      visibility.helperText.length > 0
        ? `${trainingModeCopy.fieldHintPrefix}. ${visibility.helperText}`
        : trainingModeCopy.fieldHintPrefix;
    dom.modeHelpText.textContent = visibility.helperText;
    dom.modeHelpText.classList.add('hidden');
    dom.modeHelpText.setAttribute('aria-hidden', 'true');
  });

  uiWorkflowSignal.subscribe((workflow) => {
    renderWorkflowSwitcher(workflow);
    renderWorkflowUiCopy(workflow);
    renderPracticeSetupModeVisibility(workflow);
    renderMelodySetupModeVisibility(trainingModeUiSignal.get(), workflow);
    renderPlaybackControlsModeVisibility(trainingModeUiSignal.get(), workflow);
    renderDisplayControlsModeVisibility(trainingModeUiSignal.get(), workflow);
    renderSessionToolsModeVisibility(trainingModeUiSignal.get(), workflow);
  });

  uiModeSignal.subscribe((uiMode) => {
    renderUiModeSwitcher(uiMode);
    renderUiModeVisibility(uiMode);
  });

  loadingViewSignal.subscribe(({ isLoading, message }) => {
    dom.startBtn.disabled = sessionButtonsSignal.get().startDisabled || isLoading;
    dom.instrumentSelector.disabled = isLoading;
    dom.settingsBtn.disabled = isLoading;
    syncSessionToggleButton();

    if (isLoading) {
      dom.loadingMessage.textContent = message;
      dom.loadingOverlay.classList.remove('hidden');
      dom.loadingOverlay.classList.add('flex');
      dom.loadingOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.cursor = 'wait';
    } else {
      dom.loadingOverlay.classList.add('hidden');
      dom.loadingOverlay.classList.remove('flex');
      dom.loadingOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.cursor = 'default';
    }
  });

  modalVisibilitySignal.subscribe((visibility) => {
    if (visibility.onboarding) {
      dom.onboardingModal.classList.remove('hidden');
    } else {
      dom.onboardingModal.classList.add('hidden');
    }

    if (visibility.settings) {
      dom.settingsModal.classList.remove('hidden');
    } else {
      dom.settingsModal.classList.add('hidden');
    }

    if (visibility.userData) {
      dom.userDataModal.classList.remove('hidden');
    } else {
      dom.userDataModal.classList.add('hidden');
    }

    if (visibility.help) {
      dom.helpModal.classList.remove('hidden');
    } else {
      dom.helpModal.classList.add('hidden');
    }

    if (visibility.quickHelp) {
      dom.quickHelpModal.classList.remove('hidden');
    } else {
      dom.quickHelpModal.classList.add('hidden');
    }

    if (visibility.sessionSummary) {
      dom.sessionSummaryModal.classList.remove('hidden');
    } else {
      dom.sessionSummaryModal.classList.add('hidden');
    }

    if (visibility.stats) {
      dom.statsModal.classList.remove('hidden');
    } else {
      dom.statsModal.classList.add('hidden');
    }

    if (visibility.guide) {
      dom.guideModal.classList.remove('hidden');
    } else {
      dom.guideModal.classList.add('hidden');
    }

    if (visibility.links) {
      dom.linksModal.classList.remove('hidden');
    } else {
      dom.linksModal.classList.add('hidden');
    }

    if (visibility.profileName) {
      dom.profileNameModal.classList.remove('hidden');
    } else {
      dom.profileNameModal.classList.add('hidden');
    }

    if (visibility.melodyImport) {
      dom.melodyImportModal.classList.remove('hidden');
    } else {
      dom.melodyImportModal.classList.add('hidden');
    }
  });

  profileActionsSignal.subscribe(({ updateDisabled, deleteDisabled }) => {
    dom.updateProfileBtn.disabled = updateDisabled;
    dom.deleteProfileBtn.disabled = deleteDisabled;
  });

  calibrationViewSignal.subscribe(({ isVisible, progressPercent, statusText }) => {
    dom.calibrationProgress.style.width = `${Math.max(0, Math.min(100, progressPercent))}%`;
    dom.calibrationStatus.textContent = statusText;
    if (isVisible) {
      dom.calibrationModal.classList.remove('hidden');
    } else {
      dom.calibrationModal.classList.add('hidden');
    }
  });

  timedInfoVisibleSignal.subscribe((isVisible) => {
    if (isVisible) {
      dom.timedInfo.classList.remove('hidden');
    } else {
      dom.timedInfo.classList.add('hidden');
    }
  });

  sessionGoalProgressSignal.subscribe((text) => {
    dom.sessionGoalProgress.textContent = text;
    dom.sessionGoalProgress.classList.toggle('hidden', text.length === 0);
  });

  infoSlotsSignal.subscribe((infoSlots) => {
    renderInfoSlots(infoSlots);
  });

  practiceSetupCollapsedSignal.subscribe((collapsed) => {
    renderPracticeSetupCollapsed(collapsed);
  });

  melodySetupCollapsedSignal.subscribe((collapsed) => {
    renderMelodySetupCollapsed(collapsed);
  });

  sessionToolsCollapsedSignal.subscribe((collapsed) => {
    renderSessionToolsCollapsed(collapsed);
  });

  layoutControlsExpandedSignal.subscribe(() => {
    renderDisplayControlsModeVisibility(trainingModeUiSignal.get(), uiWorkflowSignal.get());
  });

  practiceSetupSummarySignal.subscribe((summaryText) => {
    renderPracticeSetupSummary(summaryText);
  });

  melodySetupSummarySignal.subscribe((summaryText) => {
    renderMelodySetupSummary(summaryText);
  });

  sessionToolsSummarySignal.subscribe((summaryText) => {
    renderSessionToolsSummary(summaryText);
  });

  syncSessionToggleButton();
}

export function setStatusText(statusText: string) {
  statusTextSignal.set(statusText);
}

export function getStatusText() {
  return statusTextSignal.get();
}

export function setPromptText(promptText: string) {
  promptTextSignal.set(promptText);
}

export function getPromptText() {
  return promptTextSignal.get();
}

export function setResultMessage(text: string, tone: ResultTone = 'neutral') {
  resultViewSignal.set({ text, tone });
}

export function clearResultMessage() {
  resultViewSignal.set({ text: '', tone: 'neutral' });
}

export function setVolumeLevel(volumeLevel: number) {
  volumeLevelSignal.set(volumeLevel);
}

export function setStatsView(statsView: StatsViewModel) {
  statsViewSignal.set(statsView);
}

export function setSessionSummaryView(sessionSummary: LastSessionViewModel | null) {
  sessionSummaryViewSignal.set(sessionSummary);
}

export function setTimerValue(timerValue: number | string) {
  timerValueSignal.set(String(timerValue));
}

export function setScoreValue(scoreValue: number | string) {
  scoreValueSignal.set(String(scoreValue));
}

export function setTimedInfoVisible(isVisible: boolean) {
  timedInfoVisibleSignal.set(isVisible);
}

export function setSessionGoalProgress(text: string) {
  sessionGoalProgressSignal.set(text);
}

export function clearSessionGoalProgress() {
  sessionGoalProgressSignal.set('');
}

export function setPracticeSetupCollapsed(collapsed: boolean) {
  practiceSetupCollapsedSignal.set(collapsed);
}

export function getPracticeSetupCollapsed() {
  return practiceSetupCollapsedSignal.get();
}

export function togglePracticeSetupCollapsed() {
  practiceSetupCollapsedSignal.set(!practiceSetupCollapsedSignal.get());
}

export function setMelodySetupCollapsed(collapsed: boolean) {
  melodySetupCollapsedSignal.set(collapsed);
}

export function getMelodySetupCollapsed() {
  return melodySetupCollapsedSignal.get();
}

export function toggleMelodySetupCollapsed() {
  melodySetupCollapsedSignal.set(!melodySetupCollapsedSignal.get());
}

export function setSessionToolsCollapsed(collapsed: boolean) {
  sessionToolsCollapsedSignal.set(collapsed);
}

export function getSessionToolsCollapsed() {
  return sessionToolsCollapsedSignal.get();
}

export function toggleSessionToolsCollapsed() {
  sessionToolsCollapsedSignal.set(!sessionToolsCollapsedSignal.get());
}

export function setLayoutControlsExpanded(expanded: boolean) {
  layoutControlsExpandedSignal.set(expanded);
}

export function toggleLayoutControlsExpanded() {
  layoutControlsExpandedSignal.set(!layoutControlsExpandedSignal.get());
}

export function setPracticeSetupSummary(summaryText: string) {
  practiceSetupSummarySignal.set(summaryText);
}

export function setMelodySetupSummary(summaryText: string) {
  melodySetupSummarySignal.set(summaryText);
}

export function setSessionToolsSummary(summaryText: string) {
  sessionToolsSummarySignal.set(summaryText);
}

export function setInfoSlots(slot1 = '', slot2 = '', slot3 = '') {
  infoSlotsSignal.set({ slot1, slot2, slot3 });
}

export function setSessionButtonsState(partialState: Partial<SessionButtonsState>) {
  const currentState = sessionButtonsSignal.get();
  const nextState = { ...currentState, ...partialState };
  const isSame =
    currentState.startDisabled === nextState.startDisabled &&
    currentState.stopDisabled === nextState.stopDisabled &&
    currentState.hintDisabled === nextState.hintDisabled &&
    currentState.playSoundDisabled === nextState.playSoundDisabled;
  if (isSame) return;
  sessionButtonsSignal.set(nextState);
}

export function resetSessionButtonsState() {
  sessionButtonsSignal.set(defaultSessionButtonsState);
}

export function setTunerVisible(isVisible: boolean) {
  tunerVisibleSignal.set(isVisible);
}

export function setTunerReading(frequency: number | null, targetFrequency: number | null) {
  const currentState = tunerReadingSignal.get();
  if (currentState.frequency === frequency && currentState.targetFrequency === targetFrequency) {
    return;
  }
  tunerReadingSignal.set({ frequency, targetFrequency });
}

export function setTrainingModeUi(mode: string) {
  trainingModeUiSignal.set(mode);
}

export function setUiWorkflow(workflow: UiWorkflow) {
  uiWorkflowSignal.set(workflow);
}

export function refreshLayoutControlsVisibility() {
  renderDisplayControlsModeVisibility(trainingModeUiSignal.get(), uiWorkflowSignal.get());
}

export function setUiMode(uiMode: UiMode) {
  uiModeSignal.set(uiMode);
}

export function setLoadingUi(isLoading: boolean, message = '') {
  loadingViewSignal.set({ isLoading, message });
}

export function setModalVisible(modal: ModalKey, isVisible: boolean) {
  const currentVisibility = modalVisibilitySignal.get();
  if (currentVisibility[modal] === isVisible) return;
  modalVisibilitySignal.set({
    ...currentVisibility,
    [modal]: isVisible,
  });
}

export function setProfileActionsState(updateDisabled: boolean, deleteDisabled: boolean) {
  const currentState = profileActionsSignal.get();
  if (
    currentState.updateDisabled === updateDisabled &&
    currentState.deleteDisabled === deleteDisabled
  ) {
    return;
  }
  profileActionsSignal.set({ updateDisabled, deleteDisabled });
}

function setCalibrationView(partialState: Partial<CalibrationViewState>) {
  const currentState = calibrationViewSignal.get();
  const nextState = { ...currentState, ...partialState };
  const isSame =
    currentState.isVisible === nextState.isVisible &&
    currentState.progressPercent === nextState.progressPercent &&
    currentState.statusText === nextState.statusText;
  if (isSame) return;
  calibrationViewSignal.set(nextState);
}

export function showCalibrationModal(statusText = 'Listening...') {
  calibrationViewSignal.set({
    isVisible: true,
    progressPercent: 0,
    statusText,
  });
}

export function hideCalibrationModal() {
  setCalibrationView({ isVisible: false });
}

export function setCalibrationProgress(progressPercent: number) {
  setCalibrationView({ progressPercent });
}

export function setCalibrationStatus(statusText: string) {
  setCalibrationView({ statusText });
}

export function refreshDisplayFormatting() {
  renderPromptText(promptTextSignal.get());
  renderResultView(resultViewSignal.get());
  renderInfoSlots(infoSlotsSignal.get());
  renderStatsView(statsViewSignal.get());
  renderSessionSummaryView(sessionSummaryViewSignal.get());
  renderPracticeSetupSummary(practiceSetupSummarySignal.get());
  renderMelodySetupSummary(melodySetupSummarySignal.get());
  renderSessionToolsSummary(sessionToolsSummarySignal.get());
  const goalProgressText = formatMusicText(sessionGoalProgressSignal.get());
  dom.sessionGoalProgress.textContent = goalProgressText;
  dom.sessionGoalProgress.classList.toggle('hidden', goalProgressText.length === 0);
}
