import { dom } from './dom';
import type { UiWorkflow } from './training-workflows';
import { resolveWorkflowLayout } from './workflow-layout';
import {
  renderMelodySetupCollapsedView,
  renderPracticeSetupCollapsedView,
  renderSessionToolsCollapsedView,
} from './ui-workflow-panels-view';

interface WorkflowPanelsSyncState {
  mode: string;
  workflow: UiWorkflow;
  collapsed: boolean;
}

function resolveCurrentWorkflowLayout(mode: string, workflow: UiWorkflow) {
  return resolveWorkflowLayout({
    workflow,
    trainingMode: mode,
    showTabTimeline: dom.melodyShowTabTimeline.checked,
    showScrollingTab: dom.melodyShowScrollingTab.checked,
  });
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

export function syncPracticeSetupCollapsedState({
  mode,
  workflow,
  collapsed,
}: WorkflowPanelsSyncState) {
  renderPracticeSetupCollapsedView({
    layout: resolveCurrentWorkflowLayout(mode, workflow),
    collapsed,
    setPanelToggleVisualState,
  });
}

export function syncMelodySetupCollapsedState({
  mode,
  workflow,
  collapsed,
}: WorkflowPanelsSyncState) {
  renderMelodySetupCollapsedView({
    layout: resolveCurrentWorkflowLayout(mode, workflow),
    collapsed,
    toggleHidden: dom.melodySetupToggleBtn.classList.contains('hidden'),
    setPanelToggleVisualState,
  });
}

export function syncSessionToolsCollapsedState({
  mode,
  workflow,
  collapsed,
}: WorkflowPanelsSyncState) {
  renderSessionToolsCollapsedView({
    layout: resolveCurrentWorkflowLayout(mode, workflow),
    collapsed,
    toggleHidden: dom.sessionToolsToggleBtn.classList.contains('hidden'),
    setPanelToggleVisualState,
  });
}
