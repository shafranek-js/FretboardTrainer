type AppState = typeof import('./state').state;

interface SessionStartErrorRuntimeControllerDeps {
  state: Pick<AppState, 'inputSource'>;
  setAudioInputGuidanceError: (reason: 'permission' | 'device' | 'unsupported' | 'unknown') => void;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  stopListening: () => void;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
}

export function createSessionStartErrorRuntimeController(
  deps: SessionStartErrorRuntimeControllerDeps
) {
  function resolveGuidanceErrorName(error: unknown) {
    if (error instanceof DOMException) return error.name;
    if (error instanceof Error && typeof error.name === 'string') return error.name;
    return '';
  }

  function handleStartError(forCalibration: boolean, error: unknown) {
    if (!forCalibration && deps.state.inputSource === 'microphone') {
      const errorName = resolveGuidanceErrorName(error);
      if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
        deps.setAudioInputGuidanceError('permission');
      } else if (errorName === 'NotFoundError' || errorName === 'NotReadableError' || errorName === 'AbortError') {
        deps.setAudioInputGuidanceError('device');
      } else if (errorName === 'NotSupportedError') {
        deps.setAudioInputGuidanceError('unsupported');
      } else {
        deps.setAudioInputGuidanceError('unknown');
      }
      deps.refreshMicPolyphonicDetectorAudioInfoUi();
    }

    if (!forCalibration) {
      deps.stopListening();
    }
    deps.showNonBlockingError(deps.formatUserFacingError('Failed to start input', error));
  }

  return {
    handleStartError,
  };
}
