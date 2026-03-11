import { dom } from './dom';
import type { ToggleVisualStateRenderer } from './ui-workflow-layout-view';
import type { WorkflowLayout } from './workflow-layout';

interface CollapsiblePanelViewState {
  layout: WorkflowLayout;
  collapsed: boolean;
  setPanelToggleVisualState: ToggleVisualStateRenderer;
}

interface MelodySetupCollapsedViewState extends CollapsiblePanelViewState {
  toggleHidden: boolean;
}

interface SessionToolsCollapsedViewState extends CollapsiblePanelViewState {
  toggleHidden: boolean;
}

export function renderPracticeSetupCollapsedView({
  layout,
  collapsed,
  setPanelToggleVisualState,
}: CollapsiblePanelViewState) {
  if (!layout.showPracticeSetup) {
    dom.practiceSetupPanel.classList.add('hidden');
    dom.practiceSetupPanel.style.display = 'none';
    dom.practiceSetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.practiceSetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.practiceSetupToggleBtn, false);
    return;
  }

  dom.practiceSetupPanel.classList.toggle('hidden', collapsed);
  dom.practiceSetupPanel.style.display = collapsed ? 'none' : 'flex';
  dom.practiceSetupToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.practiceSetupChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.practiceSetupToggleBtn, !collapsed);
}

export function renderMelodySetupCollapsedView({
  layout,
  collapsed,
  toggleHidden,
  setPanelToggleVisualState,
}: MelodySetupCollapsedViewState) {
  const showMelodySetup =
    layout.showMelodySetup &&
    (layout.showMelodyActionControls || layout.showMelodyPracticeControls || layout.showEditingToolsControls);
  if (!showMelodySetup) {
    dom.melodySetupPanel.classList.add('hidden');
    dom.melodySetupPanel.style.display = 'none';
    dom.melodySetupToggleBtn.setAttribute('aria-expanded', 'false');
    dom.melodySetupChevron.textContent = '>';
    setPanelToggleVisualState(dom.melodySetupToggleBtn, false);
    return;
  }
  if (toggleHidden) {
    return;
  }

  dom.melodySetupPanel.classList.toggle('hidden', collapsed);
  dom.melodySetupPanel.style.display = collapsed ? 'none' : 'flex';
  dom.melodySetupToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.melodySetupChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.melodySetupToggleBtn, !collapsed);
}

export function renderSessionToolsCollapsedView({
  layout,
  collapsed,
  toggleHidden,
  setPanelToggleVisualState,
}: SessionToolsCollapsedViewState) {
  const hideSessionTools = !layout.showSessionTools || !layout.showSessionToolsContent;
  if (!hideSessionTools && toggleHidden) {
    return;
  }
  if (hideSessionTools) {
    dom.sessionToolsPanel.classList.add('hidden');
    dom.sessionToolsPanel.style.display = 'none';
    dom.sessionToolsToggleBtn.setAttribute('aria-expanded', 'false');
    dom.sessionToolsChevron.textContent = '>';
    setPanelToggleVisualState(dom.sessionToolsToggleBtn, false);
    return;
  }

  dom.sessionToolsPanel.classList.toggle('hidden', collapsed);
  dom.sessionToolsPanel.style.display = collapsed ? 'none' : 'flex';
  dom.sessionToolsToggleBtn.setAttribute('aria-expanded', String(!collapsed));
  dom.sessionToolsChevron.textContent = collapsed ? '>' : 'v';
  setPanelToggleVisualState(dom.sessionToolsToggleBtn, !collapsed);
}
