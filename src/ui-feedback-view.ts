import { dom } from './dom';
import { formatMusicText } from './note-display';

export type ResultTone = 'neutral' | 'success' | 'error';

export interface ResultViewState {
  text: string;
  tone: ResultTone;
}

export interface InfoSlotsState {
  slot1: string;
  slot2: string;
  slot3: string;
}

function syncSessionInlineFeedbackDividerVisibility() {
  const hasResultText = (dom.result.textContent?.trim().length ?? 0) > 0;
  const hasInfoText = [
    dom.infoSlot1.textContent,
    dom.infoSlot2.textContent,
    dom.infoSlot3.textContent,
  ].some((text) => (text?.trim().length ?? 0) > 0);
  const hasAnyText = hasResultText || hasInfoText;

  // Keep divider width reserved so short result labels do not shift the dock.
  dom.sessionInlineDivider.classList.remove('hidden');
  dom.sessionInlineDivider.classList.toggle('invisible', !hasResultText || !hasInfoText);
  dom.sessionInlineFeedback.classList.toggle('opacity-60', !hasAnyText);
}

export function renderStatusText(statusText: string) {
  dom.statusBar.textContent = statusText;
}

export function renderPromptText(promptText: string) {
  dom.prompt.textContent = formatMusicText(promptText);
}

export function renderResultView(resultView: ResultViewState) {
  dom.result.textContent = formatMusicText(resultView.text);
  dom.result.classList.remove('text-green-400', 'text-red-400');
  if (resultView.tone === 'success') {
    dom.result.classList.add('text-green-400');
  } else if (resultView.tone === 'error') {
    dom.result.classList.add('text-red-400');
  }
  syncSessionInlineFeedbackDividerVisibility();
}

export function renderInfoSlots({ slot1, slot2, slot3 }: InfoSlotsState) {
  dom.infoSlot1.textContent = formatMusicText(slot1);
  dom.infoSlot2.textContent = formatMusicText(slot2);
  dom.infoSlot3.textContent = formatMusicText(slot3);
  syncSessionInlineFeedbackDividerVisibility();
}
