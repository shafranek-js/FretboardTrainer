import { dom } from '../state';
import { setUserConfirmHandler } from '../user-feedback-port';

let isBound = false;
let pendingResolve: ((confirmed: boolean) => void) | null = null;

function showConfirmModal(message: string) {
  dom.confirmMessage.textContent = message;
  dom.confirmModal.classList.remove('hidden');
  dom.confirmModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    dom.confirmOkBtn.focus();
  }, 0);
}

function hideConfirmModal() {
  dom.confirmModal.classList.add('hidden');
  dom.confirmModal.setAttribute('aria-hidden', 'true');
}

function resolvePendingConfirm(confirmed: boolean) {
  if (!pendingResolve) return;
  const resolve = pendingResolve;
  pendingResolve = null;
  hideConfirmModal();
  resolve(confirmed);
}

async function openConfirmDialog(message: string) {
  if (pendingResolve) {
    resolvePendingConfirm(false);
  }

  showConfirmModal(message);
  return await new Promise<boolean>((resolve) => {
    pendingResolve = resolve;
  });
}

export function registerConfirmControls() {
  if (isBound) return;
  isBound = true;

  hideConfirmModal();
  setUserConfirmHandler(openConfirmDialog);

  dom.confirmCancelBtn.addEventListener('click', () => {
    resolvePendingConfirm(false);
  });
  dom.confirmCloseBtn.addEventListener('click', () => {
    resolvePendingConfirm(false);
  });
  dom.confirmOkBtn.addEventListener('click', () => {
    resolvePendingConfirm(true);
  });
  dom.confirmModal.addEventListener('click', (event) => {
    if (event.target === dom.confirmModal) {
      resolvePendingConfirm(false);
    }
  });
  dom.confirmModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      resolvePendingConfirm(false);
    }
  });
}
