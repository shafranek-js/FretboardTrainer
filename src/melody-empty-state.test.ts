import { describe, expect, it } from 'vitest';
import { resolveMelodyEmptyStateView } from './melody-empty-state';

describe('melody-empty-state', () => {
  it('hides the empty state outside melody-oriented workflows', () => {
    expect(
      resolveMelodyEmptyStateView({
        uiWorkflow: 'learn-notes',
        selectedMelodyId: null,
        availableMelodyCount: 3,
      })
    ).toEqual({
      visible: false,
      canLoadStarter: false,
      loadStarterLabel: '',
      canImportOrOpenEditor: false,
      importOrOpenEditorLabel: '',
      title: '',
      description: '',
    });
  });

  it('shows a starter CTA when library melodies exist but none is selected', () => {
    const view = resolveMelodyEmptyStateView({
      uiWorkflow: 'study-melody',
      selectedMelodyId: null,
      availableMelodyCount: 5,
    });

    expect(view.visible).toBe(true);
    expect(view.canLoadStarter).toBe(true);
    expect(view.loadStarterLabel).toBe('Load Starter Melody');
    expect(view.canImportOrOpenEditor).toBe(false);
    expect(view.importOrOpenEditorLabel).toBe('');
    expect(view.title).toContain('Pick a melody');
  });

  it('uses editor-specific copy when the editor workflow has melodies but none is selected', () => {
    const view = resolveMelodyEmptyStateView({
      uiWorkflow: 'editor',
      selectedMelodyId: null,
      availableMelodyCount: 5,
    });

    expect(view.visible).toBe(true);
    expect(view.canLoadStarter).toBe(true);
    expect(view.loadStarterLabel).toBe('Open First Melody');
    expect(view.canImportOrOpenEditor).toBe(true);
    expect(view.importOrOpenEditorLabel).toBe('Create or Import Melody');
    expect(view.title).toContain('edit');
    expect(view.description).toContain('create');
  });

  it('keeps library empty states library-only', () => {
    const view = resolveMelodyEmptyStateView({
      uiWorkflow: 'library',
      selectedMelodyId: null,
      availableMelodyCount: 0,
    });

    expect(view.visible).toBe(true);
    expect(view.canLoadStarter).toBe(false);
    expect(view.canImportOrOpenEditor).toBe(false);
    expect(view.description).toContain('Editor workflow');
  });

  it('keeps study empty states free of editor controls when the library is empty', () => {
    const view = resolveMelodyEmptyStateView({
      uiWorkflow: 'practice',
      selectedMelodyId: null,
      availableMelodyCount: 0,
    });

    expect(view.visible).toBe(true);
    expect(view.canLoadStarter).toBe(false);
    expect(view.canImportOrOpenEditor).toBe(false);
    expect(view.description).toContain('Editor workflow');
  });

  it('uses library-specific copy when melodies exist but none is selected', () => {
    const view = resolveMelodyEmptyStateView({
      uiWorkflow: 'library',
      selectedMelodyId: null,
      availableMelodyCount: 3,
    });

    expect(view.visible).toBe(true);
    expect(view.canLoadStarter).toBe(true);
    expect(view.loadStarterLabel).toBe('Open First Melody');
    expect(view.canImportOrOpenEditor).toBe(false);
    expect(view.description).toContain('preview');
  });
});
