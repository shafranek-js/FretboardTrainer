import { describe, expect, it, vi } from 'vitest';
import type { WorkflowLayout } from './workflow-layout';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((...values: string[]) => values.forEach((value) => classes.add(value))),
    remove: vi.fn((...values: string[]) => values.forEach((value) => classes.delete(value))),
    toggle: vi.fn((value: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    }),
    contains: (value: string) => classes.has(value),
  };
}

function createElementStub() {
  const attributes = new Map<string, string>();
  const style = {
    display: '',
    setProperty: vi.fn((name: string, value: string) => {
      if (name === 'display') style.display = value;
    }),
    removeProperty: vi.fn((name: string) => {
      if (name === 'display') style.display = '';
    }),
  };
  return {
    classList: createClassListState(),
    style,
    hidden: false,
    disabled: false,
    textContent: '',
    title: '',
    dataset: {} as Record<string, string>,
    setAttribute: vi.fn((name: string, value: string) => attributes.set(name, value)),
    removeAttribute: vi.fn((name: string) => attributes.delete(name)),
  };
}

const harness = vi.hoisted(() => ({
  options: {
    melody: { hidden: false, disabled: false, style: { display: '' } },
    practice: { hidden: false, disabled: false, style: { display: '' } },
    performance: { hidden: false, disabled: false, style: { display: '' } },
    rhythm: { hidden: false, disabled: false, style: { display: '' } },
  } as Record<string, { hidden: boolean; disabled: boolean; style: { display: string } }>,
  dom: {
    workflowLearnNotesBtn: createElementStub(),
    workflowStudyMelodyBtn: createElementStub(),
    workflowPracticeBtn: createElementStub(),
    workflowPerformBtn: createElementStub(),
    workflowLibraryBtn: createElementStub(),
    workflowEditorBtn: createElementStub(),
    uiModeSimpleBtn: createElementStub(),
    uiModeAdvancedBtn: createElementStub(),
    learningControls: createElementStub(),
    trainingModeLabel: createElementStub(),
    trainingModeField: createElementStub(),
    melodySetupToggleLabelMobile: createElementStub(),
    melodySetupToggleLabelDesktop: createElementStub(),
    sessionToolsToggleLabelMobile: createElementStub(),
    sessionToolsToggleLabelDesktop: createElementStub(),
    melodyWorkspaceTransportTitle: createElementStub(),
    melodySelectorContainer: createElementStub(),
    melodyLibraryHelpBtn: createElementStub(),
    scaleSelectorContainer: createElementStub(),
    chordSelectorContainer: createElementStub(),
    progressionSelectorContainer: createElementStub(),
    arpeggioPatternContainer: createElementStub(),
    volumeSection: createElementStub(),
    tunerSection: createElementStub(),
    metronomeQuickControls: createElementStub(),
    modeHelpText: createElementStub(),
    micAttackFilterRow: createElementStub(),
    micHoldFilterRow: createElementStub(),
    micPolyphonicDetectorRow: createElementStub(),
    performanceMicLatencyCompensationExact: createElementStub(),
    micPolyphonicActionsRow: createElementStub(),
    micPolyphonicBenchmarkInfo: createElementStub(),
    micNoiseGateInfo: createElementStub(),
    trainingMode: {
      querySelector: vi.fn((selector: string) => {
        const value = selector.match(/value="([^"]+)"/)?.[1] ?? '';
        return harness.options[value] ?? null;
      }),
    },
    practiceSetupToggleBtn: createElementStub(),
    practiceSetupSummary: createElementStub(),
    practiceSetupPanel: createElementStub(),
    practiceSetupChevron: createElementStub(),
    melodySetupToggleBtn: createElementStub(),
    melodySetupSummary: createElementStub(),
    melodySetupPanel: createElementStub(),
    melodySetupChevron: createElementStub(),
    melodyLibrarySection: createElementStub(),
    melodyPracticeSection: createElementStub(),
    melodyPracticeFieldsRow: createElementStub(),
    melodyPracticeActionsRow: createElementStub(),
    editingToolsSection: createElementStub(),
    editingToolsFieldsRow: createElementStub(),
    editingToolsActionsRow: createElementStub(),
    sessionToolsToggleBtn: createElementStub(),
    sessionToolsSummary: createElementStub(),
    sessionToolsPanel: createElementStub(),
    sessionToolsChevron: createElementStub(),
    sessionToolsPlanSection: createElementStub(),
    sessionToolsDisplaySection: createElementStub(),
    sessionToolsActiveStringsSection: createElementStub(),
    sessionToolsShowAllNotesRow: createElementStub(),
    sessionToolsShowStringTogglesRow: createElementStub(),
    sessionToolsAutoPlayPromptSoundRow: createElementStub(),
    sessionToolsRelaxPerformanceOctaveRow: createElementStub(),
    sessionToolsPitchMatchRow: createElementStub(),
    sessionToolsTimingWindowRow: createElementStub(),
    sessionToolsMicLatencyRow: createElementStub(),
    sessionToolsPrimaryControls: createElementStub(),
    stringSelector: createElementStub(),
    melodyWorkspaceTransportSection: createElementStub(),
    melodyPlaybackControls: createElementStub(),
    melodyDemoQuickControls: createElementStub(),
    studyMelodyMicTuningHost: createElementStub(),
    studyMelodyMicTuningPanel: createElementStub(),
    studyMelodyMicTuningToggleBtn: createElementStub(),
    layoutControlsHost: createElementStub(),
    layoutToggleBtn: createElementStub(),
    melodyDisplayControlsSection: createElementStub(),
    melodyDisplayControls: createElementStub(),
    melodyShowNoteChip: createElementStub(),
    layoutDisplayDivider: createElementStub(),
    layoutZoomControls: createElementStub(),
    melodyTimelineZoomControl: createElementStub(),
    scrollingTabZoomControl: createElementStub(),
  },
}));

vi.mock('./dom', () => ({ dom: harness.dom }));

import {
  renderDisplayControlsModeVisibilityView,
  renderMelodySetupModeVisibilityView,
  renderPlaybackControlsModeVisibilityView,
  renderPracticeSetupModeVisibilityView,
  renderSessionToolsModeVisibilityView,
  renderTrainingModeFieldVisibilityView,
  renderTrainingModeWorkflowOptionsView,
  renderUiModeSwitcherView,
  renderUiModeVisibilityView,
  renderWorkflowCopyView,
  renderWorkflowSwitcherView,
} from './ui-workflow-layout-view';

function buildLayout(overrides: Partial<WorkflowLayout> = {}): WorkflowLayout {
  return {
    showPracticeSetup: true,
    showMelodySetup: true,
    showPlaybackControls: true,
    showDisplayControls: true,
    showSessionTools: true,
    showSessionToolsContent: true,
    showMelodyActionControls: false,
    showMelodyPracticeControls: false,
    showEditingToolsControls: false,
    showPlaybackQuickControls: true,
    showPlaybackPromptSoundControl: true,
    showMelodyNoteHintDisplayControl: true,
    showMelodyDisplayControls: true,
    showLayoutZoomControls: true,
    showTimelineZoomControl: true,
    showScrollingZoomControl: true,
    showAnyZoomControl: true,
    sessionTools: {
      showPlanSection: true,
      showDisplaySection: true,
      showActiveStringsSection: true,
      showShowAllNotesRow: true,
      showShowStringTogglesRow: true,
      showAutoPlayPromptSoundRow: true,
      showRelaxPerformanceOctaveRow: false,
      showPitchMatchRow: false,
      showTimingWindowRow: false,
      showMicLatencyRow: false,
      dimPrimaryControls: false,
    },
    ...overrides,
  };
}

describe('ui-workflow-layout-view', () => {
  it('renders workflow and ui mode switchers via visual state callback', () => {
    const setVisualState = vi.fn();

    renderWorkflowSwitcherView('practice', setVisualState);
    expect(setVisualState).toHaveBeenCalledTimes(6);
    expect(setVisualState).toHaveBeenCalledWith(harness.dom.workflowPracticeBtn, true);
    expect(setVisualState).toHaveBeenCalledWith(harness.dom.workflowEditorBtn, false);

    setVisualState.mockClear();
    renderUiModeSwitcherView('advanced', setVisualState);
    expect(setVisualState).toHaveBeenCalledTimes(2);
    expect(setVisualState).toHaveBeenCalledWith(harness.dom.uiModeSimpleBtn, false);
    expect(setVisualState).toHaveBeenCalledWith(harness.dom.uiModeAdvancedBtn, true);
  });

  it('renders ui mode visibility and workflow copy fields', () => {
    renderUiModeVisibilityView('advanced', true);
    expect(harness.dom.trainingModeField.classList.contains('hidden')).toBe(false);
    expect(harness.dom.micAttackFilterRow.classList.contains('hidden')).toBe(false);

    renderWorkflowCopyView({
      workflow: 'editor',
      copy: {
        primaryActionLabel: '',
        primaryActionAriaLabel: '',
        melodySetupLabelMobile: 'Editor',
        melodySetupLabelDesktop: 'Editor',
        sessionToolsLabelMobile: 'Editor',
        sessionToolsLabelDesktop: 'Editor',
        melodyWorkspaceTitle: 'Playback Controls',
      },
      melodySelectionCopy: {
        sectionHint: 'Editor section',
        ariaLabel: 'Melody editor',
        helpAriaLabel: 'Help for melody editor',
      },
      trainingModeCopy: {
        label: 'Mode',
        fieldHintPrefix: 'Mode',
      },
    });

    expect(harness.dom.learningControls.dataset.panelLayout).toBe('default');
    expect(harness.dom.trainingModeLabel.textContent).toBe('Mode');
    expect(harness.dom.melodySetupToggleLabelDesktop.textContent).toBe('Editor');
    expect(harness.dom.melodySelectorContainer.dataset.sectionHint).toBe('Editor section');
    expect(harness.dom.melodyLibraryHelpBtn.setAttribute).toHaveBeenCalledWith('aria-label', 'Help for melody editor');
  });

  it('renders training mode field visibility and workflow-only mode options', () => {
    renderTrainingModeFieldVisibilityView({
      visibility: {
        showMelodySelector: true,
        showScaleSelector: false,
        showChordSelector: false,
        showProgressionSelector: false,
        showArpeggioPatternSelector: true,
        showHintButton: true,
        showFretboardMonitoring: false,
        helperText: 'Choose a melody workflow mode.',
      },
      trainingModeCopy: {
        label: 'Mode',
        fieldHintPrefix: 'Mode',
      },
    });

    expect(harness.dom.melodySelectorContainer.style.display).toBe('flex');
    expect(harness.dom.scaleSelectorContainer.classList.contains('hidden')).toBe(true);
    expect(harness.dom.arpeggioPatternContainer.classList.contains('hidden')).toBe(false);
    expect(harness.dom.volumeSection.classList.contains('hidden')).toBe(true);
    expect(harness.dom.trainingModeField.dataset.fieldHint).toBe('Mode. Choose a melody workflow mode.');
    expect(harness.dom.modeHelpText.textContent).toBe('Choose a melody workflow mode.');

    renderTrainingModeWorkflowOptionsView('learn-notes');
    expect(harness.options.melody.hidden).toBe(true);
    expect(harness.options.rhythm.disabled).toBe(true);

    renderTrainingModeWorkflowOptionsView('practice');
    expect(harness.options.melody.hidden).toBe(false);
    expect(harness.options.rhythm.disabled).toBe(false);
  });

  it('renders session tools, playback and display visibility', () => {
    const setPanelToggleVisualState = vi.fn();
    const layout = buildLayout();
    const visibility = {
      showMelodySelector: true,
      showScaleSelector: false,
      showChordSelector: false,
      showProgressionSelector: false,
      showArpeggioPatternSelector: false,
      showHintButton: true,
      showFretboardMonitoring: true,
      helperText: '',
    };

    renderSessionToolsModeVisibilityView(layout, 'Summary', true, setPanelToggleVisualState);
    expect(harness.dom.sessionToolsPanel.style.display).toBe('flex');
    expect(harness.dom.sessionToolsPlanSection.hidden).toBe(false);
    expect(harness.dom.stringSelector.style.display).toBe('');

    renderPlaybackControlsModeVisibilityView(layout, visibility, 'study-melody');
    expect(harness.dom.melodyWorkspaceTransportSection.style.display).toBe('flex');
    expect(harness.dom.studyMelodyMicTuningHost.style.display).toBe('flex');

    renderDisplayControlsModeVisibilityView(layout, true, setPanelToggleVisualState);
    expect(harness.dom.layoutControlsHost.style.display).toBe('flex');
    expect(harness.dom.melodyDisplayControlsSection.style.display).toBe('flex');
  });

  it('renders practice and melody setup blocks', () => {
    const setPanelToggleVisualState = vi.fn();

    renderPracticeSetupModeVisibilityView(buildLayout({ showPracticeSetup: false }), '', setPanelToggleVisualState);
    expect(harness.dom.practiceSetupPanel.style.display).toBe('none');

    renderMelodySetupModeVisibilityView(
      buildLayout({ showMelodyActionControls: true, showEditingToolsControls: true }),
      'Summary',
      setPanelToggleVisualState
    );
    expect(harness.dom.melodySetupPanel.style.display).toBe('flex');
    expect(harness.dom.melodyLibrarySection.hidden).toBe(false);
    expect(harness.dom.editingToolsSection.hidden).toBe(false);
  });
});
