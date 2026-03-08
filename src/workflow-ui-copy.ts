import type { UiWorkflow } from './training-workflows';

export interface WorkflowUiCopy {
  primaryActionLabel: string;
  primaryActionAriaLabel: string;
  melodySetupLabelMobile: string;
  melodySetupLabelDesktop: string;
  sessionToolsLabelMobile: string;
  sessionToolsLabelDesktop: string;
  melodyWorkspaceTitle: string;
}

export interface MelodySelectionSectionCopy {
  sectionHint: string;
  ariaLabel: string;
  helpAriaLabel: string;
}

export interface TrainingModeFieldCopy {
  label: string;
  fieldHintPrefix: string;
}

export function getWorkflowUiCopy(workflow: UiWorkflow): WorkflowUiCopy {
  if (workflow === 'study-melody') {
    return {
      primaryActionLabel: 'Start Study',
      primaryActionAriaLabel: 'Start step-by-step melody study',
      melodySetupLabelMobile: 'Melody',
      melodySetupLabelDesktop: 'Melody',
      sessionToolsLabelMobile: 'Study',
      sessionToolsLabelDesktop: 'Study',
      melodyWorkspaceTitle: 'Playback Controls',
    };
  }

  if (workflow === 'practice') {
    return {
      primaryActionLabel: 'Start Practice',
      primaryActionAriaLabel: 'Start a continuous melody practice run',
      melodySetupLabelMobile: 'Melody',
      melodySetupLabelDesktop: 'Melody',
      sessionToolsLabelMobile: 'Practice',
      sessionToolsLabelDesktop: 'Practice',
      melodyWorkspaceTitle: 'Playback Controls',
    };
  }

  if (workflow === 'perform') {
    return {
      primaryActionLabel: 'Start Run',
      primaryActionAriaLabel: 'Start a performance run',
      melodySetupLabelMobile: 'Melody',
      melodySetupLabelDesktop: 'Melody',
      sessionToolsLabelMobile: 'Perform',
      sessionToolsLabelDesktop: 'Performance',
      melodyWorkspaceTitle: 'Playback Controls',
    };
  }

  if (workflow === 'library') {
    return {
      primaryActionLabel: 'Open Editor',
      primaryActionAriaLabel: 'Open the melody editor workflow',
      melodySetupLabelMobile: 'Library',
      melodySetupLabelDesktop: 'Library',
      sessionToolsLabelMobile: 'Library',
      sessionToolsLabelDesktop: 'Library',
      melodyWorkspaceTitle: 'Playback Controls',
    };
  }

  if (workflow === 'editor') {
    return {
      primaryActionLabel: 'Create Melody',
      primaryActionAriaLabel: 'Create or import a custom melody',
      melodySetupLabelMobile: 'Editor',
      melodySetupLabelDesktop: 'Editor',
      sessionToolsLabelMobile: 'Editor',
      sessionToolsLabelDesktop: 'Editor',
      melodyWorkspaceTitle: 'Playback Controls',
    };
  }

  return {
    primaryActionLabel: 'Start Session',
    primaryActionAriaLabel: 'Start a new session',
    melodySetupLabelMobile: 'Melody',
    melodySetupLabelDesktop: 'Melody',
    sessionToolsLabelMobile: 'Practice',
    sessionToolsLabelDesktop: 'Practice',
    melodyWorkspaceTitle: 'Playback Controls',
  };
}

export function shouldShowMelodyCreateAction(workflow: UiWorkflow) {
  return workflow === 'editor';
}

export function shouldShowMelodyEditAction(workflow: UiWorkflow) {
  return workflow === 'editor';
}

export function shouldShowMelodyBakeAction(workflow: UiWorkflow) {
  return workflow === 'editor';
}

export function shouldShowMelodyExportAction(workflow: UiWorkflow) {
  return workflow === 'library';
}

export function shouldShowMelodyDeleteAction(workflow: UiWorkflow) {
  return workflow === 'library';
}

export function shouldShowPlaybackQuickControls(workflow: UiWorkflow) {
  return workflow === 'study-melody' || workflow === 'practice' || workflow === 'perform';
}

export function shouldShowPlaybackPromptSoundControl(workflow: UiWorkflow) {
  return workflow === 'study-melody' || workflow === 'practice' || workflow === 'perform';
}

export function shouldShowMelodyPracticeControls(workflow: UiWorkflow) {
  return false;
}

export function shouldShowEditingToolsControls(workflow: UiWorkflow) {
  return workflow === 'editor';
}

export function shouldShowMelodyActionControls(workflow: UiWorkflow) {
  return workflow === 'library' || workflow === 'editor';
}

export function shouldShowMelodyNoteHintDisplayControl(workflow: UiWorkflow) {
  return workflow === 'study-melody' || workflow === 'practice' || workflow === 'perform';
}

export function shouldShowMelodyDisplayControls(workflow: UiWorkflow) {
  return workflow !== 'learn-notes';
}

export function shouldShowLayoutZoomControls(workflow: UiWorkflow) {
  return workflow !== 'learn-notes';
}

export function getPlaybackTransportIdleLabel(workflow: UiWorkflow) {
  void workflow;
  return 'Preview Melody';
}

export function getPlaybackPromptLabel(workflow: UiWorkflow) {
  void workflow;
  return 'Preview';
}

export function getPlaybackCompletedLabel(workflow: UiWorkflow) {
  void workflow;
  return 'Preview complete';
}

export function getMelodySelectionSectionCopy(workflow: UiWorkflow): MelodySelectionSectionCopy {
  if (workflow === 'library') {
    return {
      sectionHint: 'Melody library. Browse, preview, export, and remove melodies without editing source notes.',
      ariaLabel: 'Melody library',
      helpAriaLabel: 'Help for melody library',
    };
  }

  if (workflow === 'editor') {
    return {
      sectionHint: 'Melody editor. Pick a melody to edit, or import source files and adjust source notes.',
      ariaLabel: 'Melody editor',
      helpAriaLabel: 'Help for melody editor',
    };
  }

  return {
    sectionHint: 'Melody selection. Pick a melody for preview, study, practice, or performance.',
    ariaLabel: 'Melody selection',
    helpAriaLabel: 'Help for melody selection',
  };
}

export function getTrainingModeFieldCopy(workflow: UiWorkflow): TrainingModeFieldCopy {
  if (workflow === 'learn-notes') {
    return {
      label: 'Training Focus',
      fieldHintPrefix: 'Training focus',
    };
  }

  return {
    label: 'Mode',
    fieldHintPrefix: 'Mode',
  };
}
