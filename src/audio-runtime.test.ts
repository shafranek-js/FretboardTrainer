import { describe, expect, it } from 'vitest';
import {
  createConfiguredAnalyserRuntime,
  ensureAudioRuntime,
  resolveAudioContextCtor,
  teardownAudioRuntime,
  type AudioRuntimeState,
  type WindowLikeAudio,
} from './audio-runtime';

describe('resolveAudioContextCtor', () => {
  it('prefers AudioContext when available', () => {
    class PrimaryAudioContext {}
    class FallbackAudioContext {}

    const ctor = resolveAudioContextCtor({
      AudioContext: PrimaryAudioContext as unknown as typeof AudioContext,
      webkitAudioContext: FallbackAudioContext as unknown as typeof AudioContext,
    });

    expect(ctor).toBe(PrimaryAudioContext);
  });

  it('falls back to webkitAudioContext and returns null when missing', () => {
    class FallbackAudioContext {}

    expect(
      resolveAudioContextCtor({
        webkitAudioContext: FallbackAudioContext as unknown as typeof AudioContext,
      })
    ).toBe(FallbackAudioContext);
    expect(resolveAudioContextCtor({})).toBeNull();
  });
});

describe('createConfiguredAnalyserRuntime', () => {
  it('configures analyser and allocates buffers', () => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 2048,
      minDecibels: 0,
      maxDecibels: 0,
      smoothingTimeConstant: 0,
    } as unknown as AnalyserNode;

    const runtime = createConfiguredAnalyserRuntime({
      createAnalyser: () => analyser,
    } as Pick<AudioContext, 'createAnalyser'>);

    expect(analyser.fftSize).toBe(4096);
    expect(analyser.minDecibels).toBe(-100);
    expect(analyser.maxDecibels).toBe(-10);
    expect(analyser.smoothingTimeConstant).toBe(0.85);
    expect(runtime.dataArray.length).toBe(4096);
    expect(runtime.frequencyDataArray.length).toBe(2048);
  });
});

describe('ensureAudioRuntime and teardownAudioRuntime', () => {
  function createEmptyRuntimeState(): AudioRuntimeState {
    return {
      audioContext: null,
      analyser: null,
      microphone: null,
      mediaStream: null,
      dataArray: null,
      frequencyDataArray: null,
    };
  }

  it('creates audio context, analyser, stream and microphone source', async () => {
    let connectCalls = 0;
    let stopCalls = 0;

    const analyser = {
      fftSize: 0,
      frequencyBinCount: 2048,
      minDecibels: 0,
      maxDecibels: 0,
      smoothingTimeConstant: 0,
    } as unknown as AnalyserNode;

    const microphone = {
      connect: () => {
        connectCalls += 1;
      },
      disconnect: () => {},
    } as unknown as MediaStreamAudioSourceNode;

    const stream = {
      getTracks: () =>
        [
          {
            stop: () => {
              stopCalls += 1;
            },
          } as unknown as MediaStreamTrack,
        ] satisfies MediaStreamTrack[],
    } as unknown as MediaStream;

    class FakeAudioContext {
      state: AudioContextState = 'running';
      createAnalyser() {
        return analyser;
      }
      createMediaStreamSource() {
        return microphone;
      }
    }

    const runtimeState = createEmptyRuntimeState();
    const windowLike: WindowLikeAudio = {
      AudioContext: FakeAudioContext as unknown as typeof AudioContext,
    };

    await ensureAudioRuntime(runtimeState, {
      windowLike,
      getUserMedia: async () => stream,
    });

    expect(runtimeState.audioContext).toBeInstanceOf(FakeAudioContext);
    expect(runtimeState.analyser).toBe(analyser);
    expect(runtimeState.mediaStream).toBe(stream);
    expect(runtimeState.microphone).toBe(microphone);
    expect(runtimeState.dataArray?.length).toBe(4096);
    expect(runtimeState.frequencyDataArray?.length).toBe(2048);
    expect(connectCalls).toBe(1);

    teardownAudioRuntime(runtimeState);
    expect(runtimeState.mediaStream).toBeNull();
    expect(runtimeState.microphone).toBeNull();
    expect(runtimeState.analyser).toBeNull();
    expect(runtimeState.dataArray).toBeNull();
    expect(runtimeState.frequencyDataArray).toBeNull();
    expect(stopCalls).toBe(1);
  });

  it('throws when no WebAudio constructor is available', async () => {
    await expect(
      ensureAudioRuntime(createEmptyRuntimeState(), {
        windowLike: {},
        getUserMedia: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
      })
    ).rejects.toThrow('Web Audio API is not supported in this browser.');
  });
});
