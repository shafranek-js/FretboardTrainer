import { describe, expect, it } from 'vitest';

import {
  getDefaultTrainingModeForUiWorkflow,
  isTrainingModeInUiWorkflow,
  resolveUiWorkflowFromTrainingMode,
  shouldShowDisplayControlsForUiWorkflow,
  shouldShowPlaybackControlsForUiWorkflow,
  shouldShowMelodySetupForUiWorkflow,
  shouldShowPracticeSetupForUiWorkflow,
  shouldShowSessionToolsForUiWorkflow,
} from './training-workflows';

describe('training-workflows', () => {
  it('derives the default workflow from training mode', () => {
    expect(resolveUiWorkflowFromTrainingMode('random')).toBe('learn-notes');
    expect(resolveUiWorkflowFromTrainingMode('melody')).toBe('study-melody');
    expect(resolveUiWorkflowFromTrainingMode('practice')).toBe('practice');
    expect(resolveUiWorkflowFromTrainingMode('performance')).toBe('perform');
    expect(resolveUiWorkflowFromTrainingMode('rhythm')).toBe('perform');
  });

  it('maps workflows to default training modes', () => {
    expect(getDefaultTrainingModeForUiWorkflow('learn-notes')).toBe('random');
    expect(getDefaultTrainingModeForUiWorkflow('study-melody')).toBe('melody');
    expect(getDefaultTrainingModeForUiWorkflow('practice')).toBe('practice');
    expect(getDefaultTrainingModeForUiWorkflow('perform')).toBe('performance');
    expect(getDefaultTrainingModeForUiWorkflow('library')).toBe('melody');
    expect(getDefaultTrainingModeForUiWorkflow('editor')).toBe('melody');
  });

  it('checks whether a training mode belongs to a workflow', () => {
    expect(isTrainingModeInUiWorkflow('adaptive', 'learn-notes')).toBe(true);
    expect(isTrainingModeInUiWorkflow('melody', 'learn-notes')).toBe(false);
    expect(isTrainingModeInUiWorkflow('practice', 'practice')).toBe(true);
    expect(isTrainingModeInUiWorkflow('performance', 'perform')).toBe(true);
    expect(isTrainingModeInUiWorkflow('rhythm', 'perform')).toBe(true);
    expect(isTrainingModeInUiWorkflow('melody', 'library')).toBe(true);
    expect(isTrainingModeInUiWorkflow('melody', 'editor')).toBe(true);
  });

  it('resolves workflow-aware panel visibility', () => {
    expect(shouldShowPracticeSetupForUiWorkflow('learn-notes')).toBe(true);
    expect(shouldShowPracticeSetupForUiWorkflow('study-melody')).toBe(false);
    expect(shouldShowPracticeSetupForUiWorkflow('practice')).toBe(false);
    expect(shouldShowPracticeSetupForUiWorkflow('perform')).toBe(false);
    expect(shouldShowPracticeSetupForUiWorkflow('library')).toBe(false);
    expect(shouldShowPracticeSetupForUiWorkflow('editor')).toBe(false);

    expect(shouldShowMelodySetupForUiWorkflow('learn-notes', 'random')).toBe(false);
    expect(shouldShowMelodySetupForUiWorkflow('study-melody', 'melody')).toBe(true);
    expect(shouldShowMelodySetupForUiWorkflow('practice', 'practice')).toBe(true);
    expect(shouldShowMelodySetupForUiWorkflow('library', 'random')).toBe(true);
    expect(shouldShowMelodySetupForUiWorkflow('editor', 'random')).toBe(true);

    expect(shouldShowPlaybackControlsForUiWorkflow('learn-notes', 'random')).toBe(false);
    expect(shouldShowPlaybackControlsForUiWorkflow('study-melody', 'melody')).toBe(true);
    expect(shouldShowPlaybackControlsForUiWorkflow('practice', 'practice')).toBe(true);
    expect(shouldShowPlaybackControlsForUiWorkflow('perform', 'performance')).toBe(true);
    expect(shouldShowPlaybackControlsForUiWorkflow('library', 'melody')).toBe(true);
    expect(shouldShowPlaybackControlsForUiWorkflow('editor', 'melody')).toBe(true);

    expect(shouldShowDisplayControlsForUiWorkflow('learn-notes', 'random')).toBe(true);
    expect(shouldShowDisplayControlsForUiWorkflow('study-melody', 'melody')).toBe(true);
    expect(shouldShowDisplayControlsForUiWorkflow('library', 'melody')).toBe(true);
    expect(shouldShowDisplayControlsForUiWorkflow('editor', 'melody')).toBe(true);

    expect(shouldShowSessionToolsForUiWorkflow('learn-notes', 'random')).toBe(true);
    expect(shouldShowSessionToolsForUiWorkflow('perform', 'rhythm')).toBe(false);
    expect(shouldShowSessionToolsForUiWorkflow('library', 'melody')).toBe(false);
    expect(shouldShowSessionToolsForUiWorkflow('editor', 'melody')).toBe(false);
  });
});
