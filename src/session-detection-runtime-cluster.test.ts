import { describe, expect, it } from 'vitest';
import { createSessionDetectionRuntimeCluster } from './session-detection-runtime-cluster';

describe('session-detection-runtime-cluster', () => {
  it('creates the detection/runtime controllers from grouped dependencies', () => {
    const cluster = createSessionDetectionRuntimeCluster({
      melodyPolyphonicFeedback: {} as never,
      stableMonophonicDetection: {} as never,
      monophonicAudioFrame: {} as never,
      audioFrame: {} as never,
      melodyRuntimeDetection: {} as never,
      polyphonicChordDetection: {} as never,
    });

    expect(cluster.melodyPolyphonicFeedbackController).toBeTruthy();
    expect(cluster.stableMonophonicDetectionController).toBeTruthy();
    expect(cluster.monophonicAudioFrameController).toBeTruthy();
    expect(cluster.audioFrameRuntimeController).toBeTruthy();
    expect(cluster.melodyRuntimeDetectionController).toBeTruthy();
    expect(cluster.polyphonicChordDetectionController).toBeTruthy();
  });
});
