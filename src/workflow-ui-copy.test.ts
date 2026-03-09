import { describe, expect, it } from 'vitest';
import {
  getMelodySelectionSectionCopy,
  getPlaybackCompletedLabel,
  getPlaybackPromptLabel,
  getPlaybackTransportIdleLabel,
  getTrainingModeFieldCopy,
  getWorkflowUiCopy,
  shouldShowMelodyBakeAction,
  shouldShowMelodyCreateAction,
  shouldShowMelodyDeleteAction,
  shouldShowMelodyDisplayControls,
  shouldShowMelodyEditAction,
  shouldShowMelodyExportAction,
  shouldShowMelodyNoteHintDisplayControl,
  shouldShowMelodyPracticeControls,
  shouldShowEditingToolsControls,
  shouldShowLayoutZoomControls,
  shouldShowPlaybackPromptSoundControl,
  shouldShowPlaybackQuickControls,
} from './workflow-ui-copy';

describe('workflow-ui-copy', () => {
  it('returns workflow-specific primary actions', () => {
    expect(getWorkflowUiCopy('learn-notes').primaryActionLabel).toBe('Start Session');
    expect(getWorkflowUiCopy('study-melody').primaryActionLabel).toBe('Start Study');
    expect(getWorkflowUiCopy('practice').primaryActionLabel).toBe('Start Practice');
    expect(getWorkflowUiCopy('perform').primaryActionLabel).toBe('Start Run');
    expect(getWorkflowUiCopy('library').primaryActionLabel).toBe('');
    expect(getWorkflowUiCopy('editor').primaryActionLabel).toBe('');
  });

  it('returns workflow-specific panel labels and workspace titles', () => {
    expect(getWorkflowUiCopy('learn-notes').sessionToolsLabelDesktop).toBe('Practice');
    expect(getWorkflowUiCopy('study-melody').sessionToolsLabelDesktop).toBe('Study');
    expect(getWorkflowUiCopy('practice').sessionToolsLabelDesktop).toBe('Practice');
    expect(getWorkflowUiCopy('perform').sessionToolsLabelDesktop).toBe('Performance');
    expect(getWorkflowUiCopy('library').melodySetupLabelDesktop).toBe('Library');
    expect(getWorkflowUiCopy('editor').melodySetupLabelDesktop).toBe('Editor');
    expect(getWorkflowUiCopy('study-melody').melodySetupLabelDesktop).toBe('Melody');
    expect(getWorkflowUiCopy('study-melody').melodyWorkspaceTitle).toBe('Playback Controls');
    expect(getWorkflowUiCopy('practice').melodyWorkspaceTitle).toBe('Playback Controls');
    expect(getWorkflowUiCopy('perform').melodyWorkspaceTitle).toBe('Playback Controls');
    expect(getWorkflowUiCopy('library').melodyWorkspaceTitle).toBe('Playback Controls');
    expect(getWorkflowUiCopy('editor').melodyWorkspaceTitle).toBe('Playback Controls');
    expect(getTrainingModeFieldCopy('learn-notes').label).toBe('Training Focus');
    expect(getTrainingModeFieldCopy('learn-notes').fieldHintPrefix).toBe('Training focus');
    expect(getTrainingModeFieldCopy('study-melody').label).toBe('Mode');
  });

  it('limits library actions and quick controls by workflow', () => {
    expect(shouldShowMelodyCreateAction('editor')).toBe(true);
    expect(shouldShowMelodyEditAction('editor')).toBe(true);
    expect(shouldShowMelodyBakeAction('editor')).toBe(true);
    expect(shouldShowMelodyExportAction('library')).toBe(true);
    expect(shouldShowMelodyDeleteAction('library')).toBe(true);
    expect(shouldShowMelodyCreateAction('library')).toBe(false);
    expect(shouldShowMelodyEditAction('practice')).toBe(false);
    expect(shouldShowMelodyExportAction('editor')).toBe(false);
    expect(shouldShowMelodyPracticeControls('study-melody')).toBe(false);
    expect(shouldShowMelodyPracticeControls('practice')).toBe(false);
    expect(shouldShowMelodyPracticeControls('perform')).toBe(false);
    expect(shouldShowMelodyPracticeControls('library')).toBe(false);
    expect(shouldShowMelodyPracticeControls('editor')).toBe(false);
    expect(shouldShowEditingToolsControls('editor')).toBe(true);
    expect(shouldShowEditingToolsControls('library')).toBe(false);
    expect(shouldShowMelodyNoteHintDisplayControl('study-melody')).toBe(true);
    expect(shouldShowMelodyNoteHintDisplayControl('practice')).toBe(true);
    expect(shouldShowMelodyNoteHintDisplayControl('perform')).toBe(true);
    expect(shouldShowMelodyNoteHintDisplayControl('library')).toBe(false);
    expect(shouldShowMelodyNoteHintDisplayControl('editor')).toBe(false);
    expect(shouldShowMelodyDisplayControls('learn-notes')).toBe(false);
    expect(shouldShowMelodyDisplayControls('study-melody')).toBe(true);
    expect(shouldShowLayoutZoomControls('learn-notes')).toBe(false);
    expect(shouldShowLayoutZoomControls('editor')).toBe(true);
    expect(shouldShowPlaybackPromptSoundControl('learn-notes')).toBe(false);
    expect(shouldShowPlaybackPromptSoundControl('study-melody')).toBe(false);
    expect(shouldShowPlaybackPromptSoundControl('perform')).toBe(true);
    expect(shouldShowPlaybackPromptSoundControl('library')).toBe(false);
    expect(shouldShowPlaybackQuickControls('library')).toBe(false);
    expect(shouldShowPlaybackQuickControls('editor')).toBe(false);
    expect(shouldShowPlaybackQuickControls('practice')).toBe(true);
    expect(shouldShowPlaybackQuickControls('perform')).toBe(true);
  });

  it('uses preview copy across melody workflows', () => {
    expect(getPlaybackTransportIdleLabel('study-melody')).toBe('Preview Melody');
    expect(getPlaybackTransportIdleLabel('library')).toBe('Preview Melody');
    expect(getPlaybackTransportIdleLabel('editor')).toBe('Preview Melody');
    expect(getPlaybackPromptLabel('study-melody')).toBe('Preview');
    expect(getPlaybackPromptLabel('library')).toBe('Preview');
    expect(getPlaybackPromptLabel('editor')).toBe('Preview');
    expect(getPlaybackCompletedLabel('study-melody')).toBe('Preview complete');
    expect(getPlaybackCompletedLabel('library')).toBe('Preview complete');
    expect(getPlaybackCompletedLabel('editor')).toBe('Preview complete');
  });

  it('specializes the melody selection panel for library and editor', () => {
    expect(getMelodySelectionSectionCopy('library').ariaLabel).toBe('Melody library');
    expect(getMelodySelectionSectionCopy('library').sectionHint).toContain('export');
    expect(getMelodySelectionSectionCopy('editor').ariaLabel).toBe('Melody editor');
    expect(getMelodySelectionSectionCopy('editor').sectionHint).toContain('import source files');
    expect(getMelodySelectionSectionCopy('study-melody').ariaLabel).toBe('Melody selection');
  });
});


