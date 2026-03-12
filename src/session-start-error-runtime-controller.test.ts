import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStartErrorRuntimeController } from './session-start-error-runtime-controller';

function createDeps() {
  const state = {
    inputSource: 'microphone' as const,
  };
  const deps = {
    state,
    setAudioInputGuidanceError: vi.fn(),
    refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
    stopListening: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
  };

  return { state, deps };
}

describe('session-start-error-runtime-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps permission failures to microphone guidance and stops the session', () => {
    const { deps } = createDeps();
    const controller = createSessionStartErrorRuntimeController(deps);

    controller.handleStartError(false, new DOMException('denied', 'NotAllowedError'));

    expect(deps.setAudioInputGuidanceError).toHaveBeenCalledWith('permission');
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).toHaveBeenCalledTimes(1);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.showNonBlockingError).toHaveBeenCalledWith('Failed to start input');
  });

  it('maps device failures to device guidance for microphone input', () => {
    const { deps } = createDeps();
    const controller = createSessionStartErrorRuntimeController(deps);

    controller.handleStartError(false, Object.assign(new Error('missing'), { name: 'NotReadableError' }));

    expect(deps.setAudioInputGuidanceError).toHaveBeenCalledWith('device');
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).toHaveBeenCalledTimes(1);
  });

  it('skips microphone guidance during calibration and still reports the error', () => {
    const { deps } = createDeps();
    const controller = createSessionStartErrorRuntimeController(deps);

    controller.handleStartError(true, new Error('boom'));

    expect(deps.setAudioInputGuidanceError).not.toHaveBeenCalled();
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).not.toHaveBeenCalled();
    expect(deps.stopListening).not.toHaveBeenCalled();
    expect(deps.showNonBlockingError).toHaveBeenCalledWith('Failed to start input');
  });

  it('skips microphone guidance for midi input but still stops the session', () => {
    const { state, deps } = createDeps();
    state.inputSource = 'midi';
    const controller = createSessionStartErrorRuntimeController(deps);

    controller.handleStartError(false, new Error('boom'));

    expect(deps.setAudioInputGuidanceError).not.toHaveBeenCalled();
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).not.toHaveBeenCalled();
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
  });
});
