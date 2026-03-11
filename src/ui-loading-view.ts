import { dom } from './dom';

export interface LoadingViewState {
  isLoading: boolean;
  message: string;
}

export interface LoadingControlsState {
  startDisabled: boolean;
}

export function renderLoadingView(
  { isLoading, message }: LoadingViewState,
  { startDisabled }: LoadingControlsState
) {
  dom.startBtn.disabled = startDisabled || isLoading;
  dom.instrumentSelector.disabled = isLoading;
  dom.settingsBtn.disabled = isLoading;

  if (isLoading) {
    dom.loadingMessage.textContent = message;
    dom.loadingOverlay.classList.remove('hidden');
    dom.loadingOverlay.classList.add('flex');
    dom.loadingOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.cursor = 'wait';
    return;
  }

  dom.loadingOverlay.classList.add('hidden');
  dom.loadingOverlay.classList.remove('flex');
  dom.loadingOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.cursor = 'default';
}
