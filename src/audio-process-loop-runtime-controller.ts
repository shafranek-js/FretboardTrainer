import type { AppState } from './state';

interface AudioProcessLoopRuntimeControllerDeps {
  state: Pick<
    AppState,
    | 'isListening'
    | 'analyser'
    | 'audioContext'
    | 'cooldown'
    | 'isCalibrating'
    | 'animationId'
    | 'dataArray'
    | 'micLastInputRms'
  >;
  requestAnimationFrame: (callback: () => void) => number;
  calculateRmsLevel: typeof import('./audio-frame-processing').calculateRmsLevel;
  setVolumeLevel: (volume: number) => void;
  handleAudioFrame: (volume: number) => void;
  onRuntimeError: (context: string, error: unknown) => void;
}

export function createAudioProcessLoopRuntimeController(
  deps: AudioProcessLoopRuntimeControllerDeps
) {
  function processAudio() {
    try {
      if (!deps.state.isListening || !deps.state.analyser || !deps.state.audioContext) return;
      if (deps.state.cooldown && !deps.state.isCalibrating) {
        deps.state.animationId = deps.requestAnimationFrame(processAudio);
        return;
      }

      deps.state.analyser.getFloatTimeDomainData(deps.state.dataArray!);
      const volume = deps.calculateRmsLevel(deps.state.dataArray!);
      deps.state.micLastInputRms = volume;
      deps.setVolumeLevel(volume);
      deps.handleAudioFrame(volume);
      deps.state.animationId = deps.requestAnimationFrame(processAudio);
    } catch (error) {
      deps.onRuntimeError('processAudio', error);
    }
  }

  return {
    processAudio,
  };
}
