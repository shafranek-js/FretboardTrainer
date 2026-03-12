import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioProcessLoopRuntimeController } from './audio-process-loop-runtime-controller';

function createDeps() {
  const state = {
    isListening: true,
    analyser: {
      getFloatTimeDomainData: vi.fn(),
    },
    audioContext: { sampleRate: 48000 },
    cooldown: false,
    isCalibrating: false,
    animationId: 0,
    dataArray: new Float32Array([0.1, 0.2]),
    micLastInputRms: 0,
  };
  const deps = {
    state,
    requestAnimationFrame: vi.fn(() => 123),
    calculateRmsLevel: vi.fn(() => 0.42),
    setVolumeLevel: vi.fn(),
    handleAudioFrame: vi.fn(),
    onRuntimeError: vi.fn(),
  };

  return { state, deps };
}

describe('audio-process-loop-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips processing when the session is not ready', () => {
    const { deps } = createDeps();
    deps.state.isListening = false;
    const controller = createAudioProcessLoopRuntimeController(deps);

    controller.processAudio();

    expect(deps.calculateRmsLevel).not.toHaveBeenCalled();
    expect(deps.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('requeues frames during cooldown without processing audio', () => {
    const { state, deps } = createDeps();
    state.cooldown = true;
    const controller = createAudioProcessLoopRuntimeController(deps);

    controller.processAudio();

    expect(deps.calculateRmsLevel).not.toHaveBeenCalled();
    expect(state.animationId).toBe(123);
    expect(deps.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it('processes audio frames and schedules the next animation frame', () => {
    const { state, deps } = createDeps();
    const controller = createAudioProcessLoopRuntimeController(deps);

    controller.processAudio();

    expect(state.analyser.getFloatTimeDomainData).toHaveBeenCalledWith(state.dataArray);
    expect(deps.calculateRmsLevel).toHaveBeenCalledWith(state.dataArray);
    expect(state.micLastInputRms).toBe(0.42);
    expect(deps.setVolumeLevel).toHaveBeenCalledWith(0.42);
    expect(deps.handleAudioFrame).toHaveBeenCalledWith(0.42);
    expect(state.animationId).toBe(123);
  });

  it('reports runtime errors through the shared error handler', () => {
    const { deps } = createDeps();
    deps.state.analyser.getFloatTimeDomainData.mockImplementation(() => {
      throw new Error('boom');
    });
    const controller = createAudioProcessLoopRuntimeController(deps);

    controller.processAudio();

    expect(deps.onRuntimeError).toHaveBeenCalledWith('processAudio', expect.any(Error));
  });
});
