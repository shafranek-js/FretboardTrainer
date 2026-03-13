import { describe, expect, it, vi } from 'vitest';
import { createWorkflowLayoutController } from './workflow-layout-controller';
import type { AppState } from '../state';

class FakeClassList {
  private values = new Set<string>();

  add(...tokens: string[]) {
    tokens.forEach((token) => this.values.add(token));
  }

  remove(...tokens: string[]) {
    tokens.forEach((token) => this.values.delete(token));
  }

  toggle(token: string, force?: boolean) {
    if (force === true) {
      this.values.add(token);
      return true;
    }
    if (force === false) {
      this.values.delete(token);
      return false;
    }
    if (this.values.has(token)) {
      this.values.delete(token);
      return false;
    }
    this.values.add(token);
    return true;
  }

  contains(token: string) {
    return this.values.has(token);
  }
}

class FakeStyle {
  display = '';
  private values = new Map<string, string>();

  setProperty(name: string, value: string) {
    if (name === 'display') {
      this.display = value;
    }
    this.values.set(name, value);
  }

  removeProperty(name: string) {
    if (name === 'display') {
      this.display = '';
    }
    this.values.delete(name);
  }

  getPropertyValue(name: string) {
    if (name === 'display') {
      return this.display;
    }
    return this.values.get(name) ?? '';
  }
}

function createElement<T extends object>(extra: T = {} as T) {
  const element = {
    classList: new FakeClassList(),
    style: new FakeStyle(),
    hidden: false,
    textContent: '',
    parentElement: null as unknown,
    appendChild(child: { parentElement?: unknown }) {
      child.parentElement = element;
      return child;
    },
    ...extra,
  };
  return element as typeof element & T;
}

function createDeps(overrides?: {
  trainingMode?: string;
  uiWorkflow?: 'learn-notes' | 'study-melody' | 'practice' | 'perform' | 'library' | 'editor';
  selectedMelodyId?: string | null;
  availableMelodyCount?: number;
  showTabTimeline?: boolean;
  showScrollingTab?: boolean;
}) {
  const dom = {
    learningControls: createElement({ dataset: {} }) as unknown as HTMLElement,
    practiceSetupPanel: createElement() as unknown as HTMLElement,
    trainingMode: createElement({ value: overrides?.trainingMode ?? 'random' }) as unknown as HTMLSelectElement,
    topPromptHost: createElement() as unknown as HTMLElement,
    promptContainer: createElement() as unknown as HTMLElement,
    learnNotesPromptHost: createElement() as unknown as HTMLElement,
    learnNotesSessionActionHost: createElement() as unknown as HTMLElement,
    melodyShowTabTimeline: createElement({ checked: overrides?.showTabTimeline ?? true }) as unknown as HTMLInputElement,
    melodyShowScrollingTab: createElement({ checked: overrides?.showScrollingTab ?? true }) as unknown as HTMLInputElement,
    melodyPracticeSection: createElement() as unknown as HTMLElement,
    melodyPracticeFieldsRow: createElement() as unknown as HTMLElement,
    melodyPracticeActionsRow: createElement() as unknown as HTMLElement,
    editingToolsSection: createElement() as unknown as HTMLElement,
    editingToolsFieldsRow: createElement() as unknown as HTMLElement,
    editingToolsActionsRow: createElement() as unknown as HTMLElement,
    sessionToolsAutoPlayPromptSoundHost: createElement() as unknown as HTMLElement,
    playbackPromptSoundHost: createElement() as unknown as HTMLElement,
    sessionPrimaryActionHost: createElement() as unknown as HTMLElement,
    sessionPrimaryActionControls: createElement() as unknown as HTMLElement,
    startSessionHelpBtn: createElement() as unknown as HTMLButtonElement,
    playbackSessionActionHost: createElement() as unknown as HTMLElement,
    sessionToolsAutoPlayPromptSoundRow: createElement() as unknown as HTMLElement,
    promptSoundTailControl: createElement() as unknown as HTMLElement,
    sessionToolsShowAllNotesRow: createElement() as unknown as HTMLElement,
    sessionToolsShowStringTogglesRow: createElement() as unknown as HTMLElement,
    layoutLearnNotesControlsHost: createElement() as unknown as HTMLElement,
    sessionToolsLearnNotesLayoutControlsHost: createElement() as unknown as HTMLElement,
    openMelodyImportBtn: createElement() as unknown as HTMLButtonElement,
    editMelodyBtn: createElement() as unknown as HTMLButtonElement,
    bakePracticeMelodyBtn: createElement() as unknown as HTMLButtonElement,
    exportMelodyMidiBtn: createElement() as unknown as HTMLButtonElement,
    deleteMelodyBtn: createElement() as unknown as HTMLButtonElement,
    melodyEventEditorPanel: createElement() as unknown as HTMLElement,
    melodyEmptyState: createElement() as unknown as HTMLElement,
    melodyEmptyStateTitle: createElement() as unknown as HTMLElement,
    melodyEmptyStateDescription: createElement() as unknown as HTMLElement,
    melodyEmptyStateLoadStarterBtn: createElement() as unknown as HTMLElement,
    melodyEmptyStateLoadStarterLabel: createElement() as unknown as HTMLElement,
    melodyEmptyStateImportBtn: createElement() as unknown as HTMLElement,
    melodyEmptyStateImportLabel: createElement() as unknown as HTMLElement,
    melodyLibrarySection: createElement() as unknown as HTMLElement,
    melodyPlaybackControls: createElement() as unknown as HTMLElement,
    melodyDemoQuickControls: createElement() as unknown as HTMLElement,
    melodyWorkspaceTransportSlot: createElement() as unknown as HTMLElement,
    melodyDisplayControls: createElement() as unknown as HTMLElement,
    melodyDisplayControlsSlot: createElement() as unknown as HTMLElement,
  };

  const state = {
    uiWorkflow: overrides?.uiWorkflow ?? 'learn-notes',
  } as const;

  const deps = {
    dom,
    state: state as Pick<AppState, 'uiWorkflow'>,
    setUiWorkflow: vi.fn(),
    setPracticeSetupCollapsed: vi.fn(),
    setMelodySetupCollapsed: vi.fn(),
    setSessionToolsCollapsed: vi.fn(),
    setLayoutControlsExpanded: vi.fn(),
    syncRecommendedDefaultsUi: vi.fn(),
    updatePracticeSetupSummary: vi.fn(),
    updateMelodySetupActionButtons: vi.fn(),
    handleModeChange: vi.fn(),
    resetMelodyWorkflowEditorState: vi.fn(),
    getSelectedMelodyId: vi.fn(() => overrides?.selectedMelodyId ?? null),
    getAvailableMelodyCount: vi.fn(() => overrides?.availableMelodyCount ?? 0),
  };

  return { deps, dom };
}

describe('workflow-layout-controller', () => {
  it('mounts transport and display controls into workspace slots', () => {
    const { deps, dom } = createDeps();
    const controller = createWorkflowLayoutController(deps);

    controller.mountWorkspaceControls();

    expect(dom.promptContainer.parentElement).toBe(dom.learnNotesPromptHost);
    expect(dom.melodyPlaybackControls.parentElement).toBe(dom.melodyWorkspaceTransportSlot);
    expect(dom.melodyDemoQuickControls.parentElement).toBe(dom.melodyWorkspaceTransportSlot);
    expect(dom.melodyDisplayControls.parentElement).toBe(dom.melodyDisplayControlsSlot);
    expect(dom.sessionPrimaryActionControls.parentElement).toBe(dom.learnNotesSessionActionHost);
    expect((dom.melodyPlaybackControls as unknown as { classList: FakeClassList }).classList.contains('flex-wrap')).toBe(true);
    expect((dom.melodyDisplayControls as unknown as { classList: FakeClassList }).classList.contains('flex-wrap')).toBe(true);
  });

  it('syncs ui workflow from the selected training mode', () => {
    const { deps } = createDeps({ trainingMode: 'performance' });
    const controller = createWorkflowLayoutController(deps);

    controller.syncUiWorkflowFromTrainingMode();

    expect(deps.state.uiWorkflow).toBe('perform');
    expect(deps.setUiWorkflow).toHaveBeenCalledWith('perform');
  });

  it('applies workflow layout and remounts dependent controls', () => {
    const { deps, dom } = createDeps({ trainingMode: 'melody', uiWorkflow: 'study-melody' });
    const controller = createWorkflowLayoutController(deps);

    controller.applyUiWorkflowLayout('study-melody');

    expect(deps.syncRecommendedDefaultsUi).toHaveBeenCalledTimes(1);
    expect(dom.sessionToolsAutoPlayPromptSoundRow.parentElement).toBe(dom.sessionToolsAutoPlayPromptSoundHost);
    expect(dom.promptContainer.parentElement).toBe(dom.topPromptHost);
    expect(dom.sessionPrimaryActionControls.parentElement).toBe(dom.playbackSessionActionHost);
    expect(dom.sessionToolsShowAllNotesRow.parentElement).toBe(dom.sessionToolsLearnNotesLayoutControlsHost);
    expect(deps.setPracticeSetupCollapsed).toHaveBeenCalledWith(false);
    expect(deps.setLayoutControlsExpanded).toHaveBeenCalledWith(false);
  });

  it('moves prompt and primary actions into the lower learn-notes action row', () => {
    const { deps, dom } = createDeps({ trainingMode: 'random', uiWorkflow: 'learn-notes' });
    const controller = createWorkflowLayoutController(deps);

    controller.applyUiWorkflowLayout('learn-notes');

    expect(dom.promptContainer.parentElement).toBe(dom.learnNotesPromptHost);
    expect(dom.sessionPrimaryActionControls.parentElement).toBe(dom.learnNotesSessionActionHost);
    expect(dom.topPromptHost.style.display).toBe('none');
    expect(dom.learnNotesPromptHost.style.display).not.toBe('none');
    expect(dom.learnNotesSessionActionHost.style.display).toBe('flex');
  });

  it('normalizes training mode when switching into another workflow', () => {
    const { deps, dom } = createDeps({ trainingMode: 'random', uiWorkflow: 'editor' });
    const controller = createWorkflowLayoutController(deps);

    controller.applyUiWorkflow('practice');

    expect(deps.resetMelodyWorkflowEditorState).toHaveBeenCalledTimes(1);
    expect(dom.trainingMode.value).toBe('practice');
    expect(deps.handleModeChange).toHaveBeenCalledTimes(1);
    expect(deps.state.uiWorkflow).toBe('practice');
    expect(deps.setUiWorkflow).toHaveBeenCalledWith('practice');
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
  });

  it('force-hides practice setup when switching away from learn-notes', () => {
    const { deps, dom } = createDeps({ trainingMode: 'melody', uiWorkflow: 'library' });
    const controller = createWorkflowLayoutController(deps);

    controller.applyUiWorkflow('practice');

    expect((dom.practiceSetupPanel as unknown as { classList: FakeClassList }).classList.contains('hidden')).toBe(true);
    expect(dom.practiceSetupPanel.style.display).toBe('none');
    expect((dom.learningControls as unknown as { dataset: Record<string, string> }).dataset.panelLayout).toBe('default');
  });

  it('shows the editor empty state when no melody is selected', () => {
    const { deps, dom } = createDeps({
      trainingMode: 'melody',
      uiWorkflow: 'editor',
      selectedMelodyId: null,
      availableMelodyCount: 0,
    });
    const controller = createWorkflowLayoutController(deps);

    controller.refreshMelodyEmptyState();

    expect((dom.melodyEmptyState as unknown as { classList: FakeClassList }).classList.contains('hidden')).toBe(false);
    expect(dom.melodyEmptyStateTitle.textContent).toBe('Your melody library is empty.');
    expect(dom.melodyEmptyStateImportLabel.textContent).toBe('Create or Import Melody');
    expect((dom.melodyEmptyStateImportBtn as unknown as { classList: FakeClassList }).classList.contains('hidden')).toBe(false);
    expect(dom.editingToolsSection.style.display).toBe('none');
  });
});




