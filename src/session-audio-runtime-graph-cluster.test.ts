import { describe, expect, it, vi } from 'vitest';

const { createSessionAudioRuntimeCluster } = vi.hoisted(() => ({
  createSessionAudioRuntimeCluster: vi.fn(),
}));

vi.mock('./dom', () => ({ dom: {} }));
vi.mock('./state', () => ({ state: {} }));
vi.mock('./session-audio-runtime-cluster', () => ({
  createSessionAudioRuntimeCluster,
}));

describe('session-audio-runtime-graph-cluster', () => {
  it('maps compact audio deps into nested audio cluster deps', async () => {
    const clusterResult = { sessionMetronomeSyncRuntimeController: {}, scheduleSessionTimeout: vi.fn() };
    createSessionAudioRuntimeCluster.mockReturnValue(clusterResult);

    const { createSessionAudioRuntimeGraphCluster } = await import('./session-audio-runtime-graph-cluster');

    const getMelodyById = vi.fn(() => ({ id: 'melody-1', events: [], sourceTimeSignature: '4/4' }));
    const getPracticeAdjustedMelody = vi.fn((melody) => ({ ...melody, adjusted: true }));
    const stopListening = vi.fn();

    const deps = {
      dom: {
        trainingMode: { value: 'perform' },
        metronomeEnabled: { checked: true },
        melodyDemoBpm: { value: '110' },
        melodySelector: { value: ' melody-1 ' },
      },
      state: {
        currentInstrument: { id: 'guitar' },
      } as any,
      requestAnimationFrame: vi.fn(() => 1),
      calculateRmsLevel: vi.fn(() => 0.4),
      setVolumeLevel: vi.fn(),
      handleAudioFrame: vi.fn(),
      onRuntimeError: vi.fn(),
      isMelodyWorkflowMode: vi.fn(() => true),
      isPerformanceStyleMode: vi.fn(() => true),
      getMelodyById,
      getPracticeAdjustedMelody,
      resolveMelodyMetronomeMeterProfile: vi.fn(),
      setMetronomeMeter: vi.fn(),
      isMetronomeRunning: vi.fn(() => false),
      stopMetronome: vi.fn(),
      getMetronomeBpm: vi.fn(() => 110),
      setMetronomeTempo: vi.fn(),
      startMetronome: vi.fn(),
      clampMelodyPlaybackBpm: vi.fn(() => 110),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
      getOpenATuningInfoFromTuning: vi.fn(),
      computeCalibratedA4FromSamples: vi.fn(),
      buildFinishCalibrationOutcome: vi.fn(),
      setCalibrationStatus: vi.fn(),
      saveSettings: vi.fn(),
      hideCalibrationModal: vi.fn(),
      stopListening,
      scheduleTrackedTimeout: vi.fn(),
      scheduleTrackedCooldown: vi.fn(),
    };

    const result = createSessionAudioRuntimeGraphCluster(deps as any);
    const args = createSessionAudioRuntimeCluster.mock.calls[0][0];
    const selectedAdjustedMelody = args.metronome.getSelectedAdjustedMelody();

    args.calibration.stopListening(true);

    expect(args.audioProcessLoop.calculateRmsLevel).toBe(deps.calculateRmsLevel);
    expect(args.metronome.dom.trainingMode).toBe(deps.dom.trainingMode);
    expect(getMelodyById).toHaveBeenCalledWith('melody-1', deps.state.currentInstrument);
    expect(getPracticeAdjustedMelody).toHaveBeenCalledWith({ id: 'melody-1', events: [], sourceTimeSignature: '4/4' });
    expect(selectedAdjustedMelody).toEqual({ id: 'melody-1', events: [], sourceTimeSignature: '4/4', adjusted: true });
    expect(stopListening).toHaveBeenCalledWith(true);
    expect(result).toBe(clusterResult);
  });
});
