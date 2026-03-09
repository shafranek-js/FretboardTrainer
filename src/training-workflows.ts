import { resolveWorkflowLayout } from './workflow-layout';

export type UiWorkflow = 'learn-notes' | 'study-melody' | 'practice' | 'perform' | 'library' | 'editor';

const LEARN_NOTES_MODES = new Set<string>([
  'random',
  'adaptive',
  'free',
  'scales',
  'intervals',
  'chords',
  'arpeggios',
  'progressions',
  'timed',
]);

const PRACTICE_MODES = new Set<string>(['practice']);
const PERFORM_MODES = new Set<string>(['performance', 'rhythm']);

export function normalizeUiWorkflow(value: unknown): UiWorkflow {
  return value === 'learn-notes' ||
    value === 'study-melody' ||
    value === 'practice' ||
    value === 'perform' ||
    value === 'library' ||
    value === 'editor'
    ? value
    : 'learn-notes';
}

export function resolveUiWorkflowFromTrainingMode(trainingMode: string): Exclude<UiWorkflow, 'library'> {
  if (PRACTICE_MODES.has(trainingMode)) return 'practice';
  if (PERFORM_MODES.has(trainingMode)) return 'perform';
  if (trainingMode === 'melody') return 'study-melody';
  return 'learn-notes';
}

export function isTrainingModeInUiWorkflow(trainingMode: string, workflow: UiWorkflow) {
  if (workflow === 'learn-notes') return LEARN_NOTES_MODES.has(trainingMode);
  if (workflow === 'study-melody') return trainingMode === 'melody';
  if (workflow === 'practice') return PRACTICE_MODES.has(trainingMode);
  if (workflow === 'perform') return PERFORM_MODES.has(trainingMode);
  if (workflow === 'editor') return trainingMode === 'melody';
  return trainingMode === 'melody';
}

export function getDefaultTrainingModeForUiWorkflow(workflow: UiWorkflow) {
  if (workflow === 'study-melody' || workflow === 'library' || workflow === 'editor') return 'melody';
  if (workflow === 'practice') return 'practice';
  if (workflow === 'perform') return 'performance';
  return 'random';
}

export function shouldShowPracticeSetupForUiWorkflow(workflow: UiWorkflow) {
  return resolveWorkflowLayout({
    workflow,
    trainingMode: getDefaultTrainingModeForUiWorkflow(workflow),
  }).showPracticeSetup;
}

export function shouldShowMelodySetupForUiWorkflow(workflow: UiWorkflow, trainingMode: string) {
  return resolveWorkflowLayout({ workflow, trainingMode }).showMelodySetup;
}

export function shouldShowPlaybackControlsForUiWorkflow(workflow: UiWorkflow, trainingMode: string) {
  return resolveWorkflowLayout({ workflow, trainingMode }).showPlaybackControls;
}

export function shouldShowDisplayControlsForUiWorkflow(workflow: UiWorkflow, trainingMode: string) {
  return resolveWorkflowLayout({ workflow, trainingMode }).showDisplayControls;
}

export function shouldShowSessionToolsForUiWorkflow(workflow: UiWorkflow, trainingMode: string) {
  return resolveWorkflowLayout({ workflow, trainingMode }).showSessionTools;
}