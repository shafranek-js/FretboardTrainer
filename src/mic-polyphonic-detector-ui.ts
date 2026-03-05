import { dom, state } from './state';
import type { MicPolyphonicDetectorProvider } from './mic-polyphonic-detector';

function getProviderLabel(provider: MicPolyphonicDetectorProvider | null) {
  if (provider === 'essentia_experimental') return 'Essentia Experimental';
  if (provider === 'spectrum') return 'Spectrum';
  return 'Unknown';
}

function formatToggleSetting(value: boolean | null | undefined) {
  if (value === true) return 'on';
  if (value === false) return 'off';
  return 'n/a';
}

export function buildMicPolyphonicDetectorAudioInfoText() {
  const configured = getProviderLabel(state.micPolyphonicDetectorProvider);
  const runtime = getProviderLabel(state.lastMicPolyphonicDetectorProviderUsed);
  const fallbackFrom = getProviderLabel(state.lastMicPolyphonicDetectorFallbackFrom);

  const parts = ['Mic labels appear after first permission grant.'];
  parts.push(`Poly detector: ${configured}${state.micPolyphonicDetectorProvider !== 'spectrum' ? ' (experimental)' : ''}.`);

  if (state.lastMicPolyphonicDetectorProviderUsed) {
    parts.push(`Runtime: ${runtime}.`);
  }
  if (state.lastMicPolyphonicDetectorFallbackFrom) {
    parts.push(`Fallback from ${fallbackFrom} to ${runtime}.`);
  }
  if (state.lastMicPolyphonicDetectorWarning) {
    parts.push(state.lastMicPolyphonicDetectorWarning);
  }
  if (state.activeAudioInputTrackSettings) {
    const settings = state.activeAudioInputTrackSettings;
    const channelCountText =
      typeof settings.channelCount === 'number' ? String(settings.channelCount) : 'n/a';
    const sampleRateText =
      typeof settings.sampleRate === 'number' ? `${Math.round(settings.sampleRate)} Hz` : 'n/a';
    const hint =
      typeof state.activeAudioInputTrackContentHint === 'string' &&
      state.activeAudioInputTrackContentHint.trim().length > 0
        ? state.activeAudioInputTrackContentHint.trim()
        : 'n/a';
    parts.push(
      `Mic capture (applied): EC ${formatToggleSetting(settings.echoCancellation)}, ` +
        `NS ${formatToggleSetting(settings.noiseSuppression)}, ` +
        `AGC ${formatToggleSetting(settings.autoGainControl)}, ` +
        `channels ${channelCountText}, sample rate ${sampleRateText}, hint ${hint}.`
    );
  }
  if (state.micPolyphonicDetectorTelemetryFrames > 0) {
    const frames = state.micPolyphonicDetectorTelemetryFrames;
    const avgMs = state.micPolyphonicDetectorTelemetryTotalLatencyMs / Math.max(1, frames);
    const maxMs = state.micPolyphonicDetectorTelemetryMaxLatencyMs;
    const lastMs = state.micPolyphonicDetectorTelemetryLastLatencyMs ?? avgMs;
    const fallbackFrames = state.micPolyphonicDetectorTelemetryFallbackFrames;
    const warningFrames = state.micPolyphonicDetectorTelemetryWarningFrames;
    const elapsedSec =
      state.micPolyphonicDetectorTelemetryWindowStartedAtMs > 0
        ? Math.max(0, (Date.now() - state.micPolyphonicDetectorTelemetryWindowStartedAtMs) / 1000)
        : 0;
    parts.push(
      `Poly telemetry: ${frames} frames` +
        (elapsedSec > 0 ? ` / ${elapsedSec.toFixed(1)}s` : '') +
        `, avg ${avgMs.toFixed(2)} ms, last ${lastMs.toFixed(2)} ms, max ${maxMs.toFixed(2)} ms` +
        (fallbackFrames > 0 ? `, fallbacks ${fallbackFrames}` : '') +
        (warningFrames > 0 ? `, warnings ${warningFrames}` : '') +
        '.'
    );
  }

  return parts.join(' ');
}

export function refreshMicPolyphonicDetectorAudioInfoUi() {
  dom.audioInputInfo.textContent = buildMicPolyphonicDetectorAudioInfoText();
  const hasTelemetry = state.micPolyphonicDetectorTelemetryFrames > 0;
  dom.exportMicPolyphonicTelemetryBtn.disabled = !hasTelemetry;
  dom.resetMicPolyphonicTelemetryBtn.disabled = !hasTelemetry;
}
