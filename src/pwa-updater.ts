import { registerSW } from 'virtual:pwa-register';
import { state } from './state';
import { setResultMessage, setStatusText } from './ui-signals';
import { createPwaUpdateController } from './pwa-update-controller';

const UPDATE_CHECK_INTERVAL_MS = 60_000;

export function registerPwaUpdater() {
  if (import.meta.env.DEV) return;

  let registrationUpdateIntervalId: number | null = null;
  let updateRegistration: (() => void) | null = null;

  const updateController = createPwaUpdateController({
    isSessionActive: () => state.isListening,
    setStatusText,
    setResultMessage,
    applyUpdate: () => {
      void updateSW(true);
    },
    scheduleCheck: (callback, delayMs) => window.setTimeout(callback, delayMs),
    cancelScheduledCheck: (handle) => window.clearTimeout(handle),
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateController.handleNeedRefresh();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      updateRegistration = () => {
        void registration.update().then(() => {
          updateController.checkPendingUpdate();
        }).catch((error) => {
          console.warn('Failed to check for an updated service worker:', error);
        });
      };

      if (registrationUpdateIntervalId !== null) {
        window.clearInterval(registrationUpdateIntervalId);
      }
      registrationUpdateIntervalId = window.setInterval(() => {
        updateRegistration?.();
      }, UPDATE_CHECK_INTERVAL_MS);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          updateRegistration?.();
          updateController.checkPendingUpdate();
        }
      });
    },
  });
}

