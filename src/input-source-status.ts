import { dom, state } from './state';

function getSelectedOptionLabel(select: HTMLSelectElement) {
  const option = select.selectedOptions?.[0];
  return option?.textContent?.trim() || '';
}

function compactDeviceLabel(label: string, fallback: string) {
  const normalized = label.trim();
  if (!normalized) return fallback;
  return normalized.length > 28 ? `${normalized.slice(0, 27)}...` : normalized;
}

export function updateSessionInputStatusHud() {
  if (!dom.inputStatusBar) return;

  if (state.inputSource === 'midi') {
    const midiLabel = compactDeviceLabel(getSelectedOptionLabel(dom.midiInputDevice), 'Default');
    dom.inputStatusBar.textContent = `MIDI: ${midiLabel}`;
    return;
  }

  const micLabel = compactDeviceLabel(getSelectedOptionLabel(dom.audioInputDevice), 'Default');
  dom.inputStatusBar.textContent = `Mic: ${micLabel}`;
}
