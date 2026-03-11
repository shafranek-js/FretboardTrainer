import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  renderPracticeSetupCollapsedView: vi.fn(),
  renderMelodySetupCollapsedView: vi.fn(),
  renderSessionToolsCollapsedView: vi.fn(),
  resolveWorkflowLayout: vi.fn(),
  dom: {
    melodyShowTabTimeline: { checked: true },
    melodyShowScrollingTab: { checked: false },
    melodySetupToggleBtn: { classList: { contains: vi.fn(() => true) } },
    sessionToolsToggleBtn: { classList: { contains: vi.fn(() => false) } },
  },
}));

vi.mock('./dom', () => ({ dom: mocks.dom }));
vi.mock('./workflow-layout', () => ({
  resolveWorkflowLayout: mocks.resolveWorkflowLayout,
}));
vi.mock('./ui-workflow-panels-view', () => ({
  renderPracticeSetupCollapsedView: mocks.renderPracticeSetupCollapsedView,
  renderMelodySetupCollapsedView: mocks.renderMelodySetupCollapsedView,
  renderSessionToolsCollapsedView: mocks.renderSessionToolsCollapsedView,
}));

import {
  syncMelodySetupCollapsedState,
  syncPracticeSetupCollapsedState,
  syncSessionToolsCollapsedState,
} from './ui-workflow-panels-sync';

describe('ui-workflow-panels-sync', () => {
  it('syncs practice setup collapsed state', () => {
    const layout = { id: 'layout' };
    mocks.resolveWorkflowLayout.mockReturnValue(layout);

    syncPracticeSetupCollapsedState({
      mode: 'random',
      workflow: 'practice',
      collapsed: true,
    });

    expect(mocks.resolveWorkflowLayout).toHaveBeenCalledWith({
      workflow: 'practice',
      trainingMode: 'random',
      showTabTimeline: true,
      showScrollingTab: false,
    });
    expect(mocks.renderPracticeSetupCollapsedView).toHaveBeenCalledWith({
      layout,
      collapsed: true,
      setPanelToggleVisualState: expect.any(Function),
    });
  });

  it('syncs melody setup collapsed state with hidden toggle flag', () => {
    const layout = { id: 'layout' };
    mocks.resolveWorkflowLayout.mockReturnValue(layout);

    syncMelodySetupCollapsedState({
      mode: 'melody',
      workflow: 'study-melody',
      collapsed: false,
    });

    expect(mocks.renderMelodySetupCollapsedView).toHaveBeenCalledWith({
      layout,
      collapsed: false,
      toggleHidden: true,
      setPanelToggleVisualState: expect.any(Function),
    });
  });

  it('syncs session tools collapsed state with toggle visibility', () => {
    const layout = { id: 'layout' };
    mocks.resolveWorkflowLayout.mockReturnValue(layout);

    syncSessionToolsCollapsedState({
      mode: 'random',
      workflow: 'learn-notes',
      collapsed: false,
    });

    expect(mocks.renderSessionToolsCollapsedView).toHaveBeenCalledWith({
      layout,
      collapsed: false,
      toggleHidden: false,
      setPanelToggleVisualState: expect.any(Function),
    });
  });
});
