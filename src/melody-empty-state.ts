import type { UiWorkflow } from './training-workflows';

export interface MelodyEmptyStateView {
  visible: boolean;
  canLoadStarter: boolean;
  loadStarterLabel: string;
  canImportOrOpenEditor: boolean;
  importOrOpenEditorLabel: string;
  title: string;
  description: string;
}

export function resolveMelodyEmptyStateView(options: {
  uiWorkflow: UiWorkflow;
  selectedMelodyId: string | null;
  availableMelodyCount: number;
}): MelodyEmptyStateView {
  const melodyWorkflowActive =
    options.uiWorkflow === 'study-melody' ||
    options.uiWorkflow === 'practice' ||
    options.uiWorkflow === 'perform' ||
    options.uiWorkflow === 'library' ||
    options.uiWorkflow === 'editor';
  const hasSelectedMelody = typeof options.selectedMelodyId === 'string' && options.selectedMelodyId.length > 0;
  const hasAvailableMelodies = options.availableMelodyCount > 0;

  if (!melodyWorkflowActive || hasSelectedMelody) {
    return {
      visible: false,
      canLoadStarter: false,
      loadStarterLabel: '',
      canImportOrOpenEditor: false,
      importOrOpenEditorLabel: '',
      title: '',
      description: '',
    };
  }

  if (hasAvailableMelodies) {
    if (options.uiWorkflow === 'editor') {
      return {
        visible: true,
        canLoadStarter: true,
        loadStarterLabel: 'Open First Melody',
        canImportOrOpenEditor: true,
        importOrOpenEditorLabel: 'Create or Import Melody',
        title: 'Pick a melody to edit or create a new one.',
        description: 'Load a melody from the library, or create/import a custom TAB, MIDI, MuseScore, or Guitar Pro melody in the editor.',
      };
    }

    if (options.uiWorkflow === 'library') {
      return {
        visible: true,
        canLoadStarter: true,
        loadStarterLabel: 'Open First Melody',
        canImportOrOpenEditor: false,
        importOrOpenEditorLabel: '',
        title: 'Pick a melody to browse or preview.',
        description: 'Choose a melody from the library to preview it, export it, or remove a custom entry.',
      };
    }

    return {
      visible: true,
      canLoadStarter: true,
      loadStarterLabel: 'Load Starter Melody',
      canImportOrOpenEditor: false,
      importOrOpenEditorLabel: '',
      title: 'Pick a melody to start practicing.',
      description: 'Load a melody from the library. Use the Editor workflow if you need to create or import a new melody.',
    };
  }

  if (options.uiWorkflow === 'editor') {
    return {
      visible: true,
      canLoadStarter: false,
      loadStarterLabel: '',
      canImportOrOpenEditor: true,
      importOrOpenEditorLabel: 'Create or Import Melody',
      title: 'Your melody library is empty.',
      description: 'Create or import a custom TAB, MIDI, MuseScore, or Guitar Pro melody to start editing notes.',
    };
  }

  if (options.uiWorkflow === 'library') {
    return {
      visible: true,
      canLoadStarter: false,
      loadStarterLabel: '',
      canImportOrOpenEditor: false,
      importOrOpenEditorLabel: '',
      title: 'Your melody library is empty.',
      description: 'Switch to the Editor workflow when you want to create or import a melody.',
    };
  }

  return {
    visible: true,
    canLoadStarter: false,
    loadStarterLabel: '',
    canImportOrOpenEditor: false,
    importOrOpenEditorLabel: '',
    title: 'Your melody library is empty.',
    description: 'Switch to the Editor workflow to create or import a melody, then come back here to study, practice, or perform it.',
  };
}
