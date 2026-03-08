import { dom, state } from './state';
import { refreshAudioInputGuidanceUi } from './audio-input-guidance-ui';

export function refreshMicPolyphonicDetectorAudioInfoUi() {
  refreshAudioInputGuidanceUi();
  const hasTelemetry = state.micPolyphonicDetectorTelemetryFrames > 0;
  dom.exportMicPolyphonicTelemetryBtn.disabled = !hasTelemetry;
  dom.resetMicPolyphonicTelemetryBtn.disabled = !hasTelemetry;
}
