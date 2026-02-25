import { dom, state } from './state';
import {
  registerMicPolyphonicDetectorAdapter,
  type MicPolyphonicDetectorProvider,
} from './mic-polyphonic-detector';
import {
  resolveMicPolyphonicDetectorProviderFromUrlSearch,
  shouldAttemptOptionalMicPolyphonicProviderRegistration,
} from './mic-polyphonic-detector-flags';
import { createEssentiaExperimentalMicPolyphonicDetectorAdapter } from './mic-polyphonic-detectors/essentia-experimental';

/**
 * Registers optional/experimental mic polyphonic detector adapters if available.
 * Safe to call during startup; unavailable adapters are silently skipped.
 */
function resolveRequestedProviderOverride(): MicPolyphonicDetectorProvider | null {
  try {
    return resolveMicPolyphonicDetectorProviderFromUrlSearch(window.location.search);
  } catch {
    return null;
  }
}

export async function registerOptionalMicPolyphonicDetectorAdapters() {
  try {
    const urlOverrideProvider = resolveRequestedProviderOverride();
    if (urlOverrideProvider) {
      state.micPolyphonicDetectorProvider = urlOverrideProvider;
      dom.micPolyphonicDetectorProvider.value = urlOverrideProvider;
      console.info(`[mic-poly] Provider override from URL: ${urlOverrideProvider}`);
    }

    const requestedProvider = urlOverrideProvider ?? state.micPolyphonicDetectorProvider;
    if (!shouldAttemptOptionalMicPolyphonicProviderRegistration(requestedProvider)) {
      return;
    }

    const essentiaAdapter = await createEssentiaExperimentalMicPolyphonicDetectorAdapter();
    if (essentiaAdapter) {
      registerMicPolyphonicDetectorAdapter('essentia_experimental', essentiaAdapter);
      console.info('[mic-poly] Registered optional provider: essentia_experimental');
    } else {
      console.info('[mic-poly] Optional provider essentia_experimental requested but not available; runtime will fall back to spectrum.');
    }
  } catch (error) {
    console.warn('Failed to register optional mic polyphonic detector adapters:', error);
  }
}
