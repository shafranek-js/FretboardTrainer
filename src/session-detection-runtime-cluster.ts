import { createAudioFrameRuntimeController } from './audio-frame-runtime-controller';
import { createMelodyPolyphonicFeedbackController } from './melody-polyphonic-feedback-controller';
import { createMelodyRuntimeDetectionController } from './melody-runtime-detection-controller';
import { createMonophonicAudioFrameController } from './monophonic-audio-frame-controller';
import { createPolyphonicChordDetectionController } from './polyphonic-chord-detection-controller';
import { createStableMonophonicDetectionController } from './stable-monophonic-detection-controller';

interface SessionDetectionRuntimeClusterDeps {
  melodyPolyphonicFeedback: Parameters<typeof createMelodyPolyphonicFeedbackController>[0];
  stableMonophonicDetection: Parameters<typeof createStableMonophonicDetectionController>[0];
  monophonicAudioFrame: Parameters<typeof createMonophonicAudioFrameController>[0];
  audioFrame: Parameters<typeof createAudioFrameRuntimeController>[0];
  melodyRuntimeDetection: Parameters<typeof createMelodyRuntimeDetectionController>[0];
  polyphonicChordDetection: Parameters<typeof createPolyphonicChordDetectionController>[0];
}

export function createSessionDetectionRuntimeCluster(deps: SessionDetectionRuntimeClusterDeps) {
  const melodyPolyphonicFeedbackController = createMelodyPolyphonicFeedbackController(
    deps.melodyPolyphonicFeedback
  );
  const stableMonophonicDetectionController = createStableMonophonicDetectionController(
    deps.stableMonophonicDetection
  );
  const monophonicAudioFrameController = createMonophonicAudioFrameController(
    deps.monophonicAudioFrame
  );
  const audioFrameRuntimeController = createAudioFrameRuntimeController(deps.audioFrame);
  const melodyRuntimeDetectionController = createMelodyRuntimeDetectionController(
    deps.melodyRuntimeDetection
  );
  const polyphonicChordDetectionController = createPolyphonicChordDetectionController(
    deps.polyphonicChordDetection
  );

  return {
    melodyPolyphonicFeedbackController,
    stableMonophonicDetectionController,
    monophonicAudioFrameController,
    audioFrameRuntimeController,
    melodyRuntimeDetectionController,
    polyphonicChordDetectionController,
  };
}
