/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { loadSettings, loadStats } from './src/storage';
import { bindUiSignals } from './src/ui-signals';
import { registerSessionControls } from './src/controllers/session-controller';
import {
  registerProfileControls,
  updateProfileButtonsState,
} from './src/controllers/profile-controller';
import { registerModalControls } from './src/controllers/modal-controller';
import { registerResizeObserver } from './src/controllers/resize-controller';
import { registerConfirmControls } from './src/controllers/confirm-controller';
import { showNonBlockingError } from './src/app-feedback';
import { setUserErrorReporter } from './src/user-feedback-port';
import { registerOptionalMicPolyphonicDetectorAdapters } from './src/mic-polyphonic-detector-bootstrap';

let globalErrorHandlersBound = false;

async function clearDevServiceWorkerState() {
  if (!import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Failed to unregister dev service workers:', error);
  }
}

function reportBootstrapError(error: unknown) {
  console.error('Application bootstrap failed:', error);
  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    statusBar.textContent = 'Startup failed. Reload the page.';
  }
}

function reportGlobalRuntimeIssue(context: string, error: unknown) {
  console.error(`[Global Runtime Error] ${context}:`, error);
  const statusBar = document.getElementById('statusBar');
  if (statusBar) {
    statusBar.textContent = 'Runtime error occurred. Check console.';
  }
}

function bindGlobalErrorHandlers() {
  if (globalErrorHandlersBound) return;
  globalErrorHandlersBound = true;

  window.addEventListener('error', (event) => {
    reportGlobalRuntimeIssue(event.message || 'window.error', event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportGlobalRuntimeIssue('unhandledrejection', event.reason);
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  try {
    bindGlobalErrorHandlers();
    await clearDevServiceWorkerState();

    bindUiSignals();
    setUserErrorReporter(showNonBlockingError);
    await loadSettings(); // This now loads profiles, applies settings, and pre-loads audio
    await registerOptionalMicPolyphonicDetectorAdapters();
    loadStats();
    updateProfileButtonsState();

    registerSessionControls();
    registerProfileControls();
    registerModalControls();
    registerConfirmControls();
    registerResizeObserver();
  } catch (error) {
    reportBootstrapError(error);
  }
});
