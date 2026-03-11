import { dom } from './dom';
import { formatMusicText } from './note-display';

function applySummaryTooltip(
  summaryText: string,
  options: {
    summaryElement: HTMLElement;
    toggleButton: HTMLButtonElement;
    panel: HTMLElement;
    hideWhenToggleHidden?: boolean;
  }
) {
  options.summaryElement.textContent = summaryText;
  options.summaryElement.title = summaryText;
  options.summaryElement.removeAttribute('title');
  options.toggleButton.dataset.summaryTooltip = summaryText;
  options.panel.dataset.summaryTooltip = summaryText;
  options.toggleButton.removeAttribute('title');
  options.panel.removeAttribute('title');

  if (!options.hideWhenToggleHidden) {
    return;
  }

  options.summaryElement.style.display =
    options.toggleButton.classList.contains('hidden') || summaryText.length === 0 ? 'none' : '';
}

export function renderTimerValue(timerValue: string) {
  dom.timer.textContent = timerValue;
}

export function renderScoreValue(scoreValue: string) {
  dom.score.textContent = scoreValue;
}

export function renderSessionGoalProgress(text: string) {
  dom.sessionGoalProgress.textContent = text;
  dom.sessionGoalProgress.classList.toggle('hidden', text.length === 0);
}

export function renderFormattedSessionGoalProgress(text: string) {
  const formattedText = formatMusicText(text);
  dom.sessionGoalProgress.textContent = formattedText;
  dom.sessionGoalProgress.classList.toggle('hidden', formattedText.length === 0);
}

export function renderPracticeSetupSummary(summaryText: string) {
  applySummaryTooltip(summaryText, {
    summaryElement: dom.practiceSetupSummary,
    toggleButton: dom.practiceSetupToggleBtn,
    panel: dom.practiceSetupPanel,
  });
}

export function renderMelodySetupSummary(summaryText: string) {
  applySummaryTooltip(summaryText, {
    summaryElement: dom.melodySetupSummary,
    toggleButton: dom.melodySetupToggleBtn,
    panel: dom.melodySetupPanel,
    hideWhenToggleHidden: true,
  });
}

export function renderSessionToolsSummary(summaryText: string) {
  applySummaryTooltip(summaryText, {
    summaryElement: dom.sessionToolsSummary,
    toggleButton: dom.sessionToolsToggleBtn,
    panel: dom.sessionToolsPanel,
    hideWhenToggleHidden: true,
  });
}
