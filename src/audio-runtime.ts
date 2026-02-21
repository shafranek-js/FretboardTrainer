export interface AudioRuntimeState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  mediaStream: MediaStream | null;
  dataArray: Float32Array | null;
  frequencyDataArray: Float32Array | null;
}

export interface WindowLikeAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

interface ConfiguredAnalyserRuntime {
  analyser: AnalyserNode;
  dataArray: Float32Array;
  frequencyDataArray: Float32Array;
}

interface EnsureAudioRuntimeDeps {
  windowLike?: WindowLikeAudio;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
}

export function resolveAudioContextCtor(windowLike: WindowLikeAudio) {
  return windowLike.AudioContext || windowLike.webkitAudioContext || null;
}

export function createConfiguredAnalyserRuntime(
  audioContext: Pick<AudioContext, 'createAnalyser'>
): ConfiguredAnalyserRuntime {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  analyser.minDecibels = -100;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  return {
    analyser,
    dataArray: new Float32Array(analyser.fftSize),
    frequencyDataArray: new Float32Array(analyser.frequencyBinCount),
  };
}

export async function ensureAudioRuntime(
  runtimeState: AudioRuntimeState,
  deps: EnsureAudioRuntimeDeps = {}
) {
  const windowLike =
    deps.windowLike ??
    ((window as WindowLikeAudio & typeof globalThis) satisfies WindowLikeAudio & typeof globalThis);
  const getUserMedia =
    deps.getUserMedia ?? ((constraints: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(constraints));

  if (!runtimeState.audioContext || runtimeState.audioContext.state === 'closed') {
    const audioContextCtor = resolveAudioContextCtor(windowLike);
    if (!audioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    runtimeState.audioContext = new audioContextCtor();
  }

  let shouldConnectMicrophone = false;

  if (!runtimeState.analyser) {
    const analyserRuntime = createConfiguredAnalyserRuntime(runtimeState.audioContext);
    runtimeState.analyser = analyserRuntime.analyser;
    runtimeState.dataArray = analyserRuntime.dataArray;
    runtimeState.frequencyDataArray = analyserRuntime.frequencyDataArray;
    shouldConnectMicrophone = Boolean(runtimeState.microphone);
  }

  if (!runtimeState.mediaStream) {
    runtimeState.mediaStream = await getUserMedia({ audio: true });
  }

  if (!runtimeState.microphone && runtimeState.mediaStream) {
    runtimeState.microphone = runtimeState.audioContext.createMediaStreamSource(runtimeState.mediaStream);
    shouldConnectMicrophone = true;
  }

  if (shouldConnectMicrophone && runtimeState.microphone && runtimeState.analyser) {
    runtimeState.microphone.connect(runtimeState.analyser);
  }
}

export function teardownAudioRuntime(runtimeState: AudioRuntimeState) {
  if (runtimeState.microphone) runtimeState.microphone.disconnect();
  runtimeState.mediaStream?.getTracks().forEach((track) => track.stop());

  runtimeState.mediaStream = null;
  runtimeState.microphone = null;
  runtimeState.analyser = null;
  runtimeState.dataArray = null;
  runtimeState.frequencyDataArray = null;
}
