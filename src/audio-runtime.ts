export interface AudioRuntimeState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  mediaStream: MediaStream | null;
  dataArray: Float32Array | null;
  frequencyDataArray: Float32Array | null;
  activeAudioAnalyserProfile?: AudioAnalyserProfile | null;
  activeAudioInputDeviceId?: string | null;
  activeAudioInputTrackSettings?: AudioInputProcessingSettings | null;
  activeAudioInputTrackContentHint?: string | null;
  requestedAudioInputContentHint?: string | null;
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
  audioInputDeviceId?: string | null;
  analyserProfile?: AudioAnalyserProfile;
}

export type AudioAnalyserProfile = 'default' | 'low-latency-performance';

export interface AudioInputProcessingSettings {
  echoCancellation: boolean | null;
  noiseSuppression: boolean | null;
  autoGainControl: boolean | null;
  channelCount: number | null;
  sampleRate: number | null;
}

export function buildMusicInputTrackConstraints(
  requestedAudioInputDeviceId: string | null
): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  };
  if (requestedAudioInputDeviceId) {
    constraints.deviceId = { exact: requestedAudioInputDeviceId };
  }
  return constraints;
}

function resolveAppliedAudioInputTrackSettings(
  trackSettings: MediaTrackSettings | undefined
): AudioInputProcessingSettings {
  if (!trackSettings) {
    return {
      echoCancellation: null,
      noiseSuppression: null,
      autoGainControl: null,
      channelCount: null,
      sampleRate: null,
    };
  }
  return {
    echoCancellation:
      typeof trackSettings.echoCancellation === 'boolean' ? trackSettings.echoCancellation : null,
    noiseSuppression:
      typeof trackSettings.noiseSuppression === 'boolean' ? trackSettings.noiseSuppression : null,
    autoGainControl:
      typeof trackSettings.autoGainControl === 'boolean' ? trackSettings.autoGainControl : null,
    channelCount: typeof trackSettings.channelCount === 'number' ? trackSettings.channelCount : null,
    sampleRate: typeof trackSettings.sampleRate === 'number' ? trackSettings.sampleRate : null,
  };
}

function setAudioTrackMusicContentHint(track: MediaStreamTrack | undefined) {
  if (!track) return null;
  const trackWithHint = track as MediaStreamTrack & { contentHint?: string };
  try {
    trackWithHint.contentHint = 'music';
  } catch {
    // Ignore browsers that expose contentHint as readonly or unsupported.
  }
  return typeof trackWithHint.contentHint === 'string' ? trackWithHint.contentHint : null;
}

async function openMusicInputStream(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
  requestedAudioInputDeviceId: string | null
) {
  const constraints = buildMusicInputTrackConstraints(requestedAudioInputDeviceId);
  return getUserMedia({ audio: constraints });
}

function applyAudioInputTrackMetadata(
  runtimeState: AudioRuntimeState,
  mediaStream: MediaStream,
  requestedAudioInputDeviceId: string | null
) {
  const track = mediaStream.getAudioTracks?.()[0];
  const trackSettings = track?.getSettings?.();
  runtimeState.activeAudioInputDeviceId = trackSettings?.deviceId ?? requestedAudioInputDeviceId;
  runtimeState.activeAudioInputTrackSettings = resolveAppliedAudioInputTrackSettings(trackSettings);
  runtimeState.activeAudioInputTrackContentHint = setAudioTrackMusicContentHint(track);
  runtimeState.requestedAudioInputContentHint = 'music';
}

export function resolveAudioContextCtor(windowLike: WindowLikeAudio) {
  return windowLike.AudioContext || windowLike.webkitAudioContext || null;
}

interface AudioAnalyserConfig {
  fftSize: number;
  minDecibels: number;
  maxDecibels: number;
  smoothingTimeConstant: number;
}

function resolveAudioAnalyserConfig(profile: AudioAnalyserProfile): AudioAnalyserConfig {
  if (profile === 'low-latency-performance') {
    return {
      fftSize: 2048,
      minDecibels: -100,
      maxDecibels: -10,
      smoothingTimeConstant: 0.55,
    };
  }
  return {
    fftSize: 4096,
    minDecibels: -100,
    maxDecibels: -10,
    smoothingTimeConstant: 0.85,
  };
}

export function configureAnalyserNode(
  analyser: AnalyserNode,
  profile: AudioAnalyserProfile = 'default'
) {
  const config = resolveAudioAnalyserConfig(profile);
  analyser.fftSize = config.fftSize;
  analyser.minDecibels = config.minDecibels;
  analyser.maxDecibels = config.maxDecibels;
  analyser.smoothingTimeConstant = config.smoothingTimeConstant;
  return config;
}

export function createConfiguredAnalyserRuntime(
  audioContext: Pick<AudioContext, 'createAnalyser'>,
  options: { profile?: AudioAnalyserProfile } = {}
): ConfiguredAnalyserRuntime {
  const analyser = audioContext.createAnalyser();
  const profile = options.profile ?? 'default';
  configureAnalyserNode(analyser, profile);

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
  const requestedAudioInputDeviceId = deps.audioInputDeviceId ?? null;
  const requestedAnalyserProfile = deps.analyserProfile ?? 'default';

  if (!runtimeState.audioContext || runtimeState.audioContext.state === 'closed') {
    const audioContextCtor = resolveAudioContextCtor(windowLike);
    if (!audioContextCtor) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    runtimeState.audioContext = new audioContextCtor();
  }

  let shouldConnectMicrophone = false;

  if (!runtimeState.analyser) {
    const analyserRuntime = createConfiguredAnalyserRuntime(runtimeState.audioContext, {
      profile: requestedAnalyserProfile,
    });
    runtimeState.analyser = analyserRuntime.analyser;
    runtimeState.dataArray = analyserRuntime.dataArray;
    runtimeState.frequencyDataArray = analyserRuntime.frequencyDataArray;
    runtimeState.activeAudioAnalyserProfile = requestedAnalyserProfile;
    shouldConnectMicrophone = Boolean(runtimeState.microphone);
  } else if ((runtimeState.activeAudioAnalyserProfile ?? 'default') !== requestedAnalyserProfile) {
    configureAnalyserNode(runtimeState.analyser, requestedAnalyserProfile);
    runtimeState.dataArray = new Float32Array(runtimeState.analyser.fftSize);
    runtimeState.frequencyDataArray = new Float32Array(runtimeState.analyser.frequencyBinCount);
    runtimeState.activeAudioAnalyserProfile = requestedAnalyserProfile;
  }

  if (!runtimeState.mediaStream) {
    runtimeState.mediaStream = await openMusicInputStream(getUserMedia, requestedAudioInputDeviceId);
    applyAudioInputTrackMetadata(runtimeState, runtimeState.mediaStream, requestedAudioInputDeviceId);
  } else if ((runtimeState.activeAudioInputDeviceId ?? null) !== requestedAudioInputDeviceId) {
    runtimeState.microphone?.disconnect();
    runtimeState.mediaStream.getTracks().forEach((track) => track.stop());
    runtimeState.mediaStream = null;
    runtimeState.microphone = null;
    runtimeState.activeAudioInputDeviceId = null;
    runtimeState.activeAudioInputTrackSettings = null;
    runtimeState.activeAudioInputTrackContentHint = null;

    runtimeState.mediaStream = await openMusicInputStream(getUserMedia, requestedAudioInputDeviceId);
    applyAudioInputTrackMetadata(runtimeState, runtimeState.mediaStream, requestedAudioInputDeviceId);
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
  runtimeState.activeAudioAnalyserProfile = null;
  runtimeState.activeAudioInputDeviceId = null;
  runtimeState.activeAudioInputTrackSettings = null;
  runtimeState.activeAudioInputTrackContentHint = null;
  runtimeState.requestedAudioInputContentHint = null;
}
