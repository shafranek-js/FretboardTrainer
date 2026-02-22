import { dom, state } from './state';
import { buildInputStatusText } from './input-source-status-format';

function getSelectedOptionLabel(select: HTMLSelectElement) {
  const option = select.selectedOptions?.[0];
  return option?.textContent?.trim() || '';
}

export function updateSessionInputStatusHud() {
  if (!dom.inputStatusBar) return;

  if (state.inputSource === 'midi') {
    const statusText = buildInputStatusText('midi', getSelectedOptionLabel(dom.midiInputDevice));
    dom.inputStatusBar.textContent = statusText.shortText;
    dom.inputStatusBar.title = statusText.fullText;
    return;
  }

  const statusText = buildInputStatusText('microphone', getSelectedOptionLabel(dom.audioInputDevice));
  dom.inputStatusBar.textContent = statusText.shortText;
  dom.inputStatusBar.title = statusText.fullText;
}
