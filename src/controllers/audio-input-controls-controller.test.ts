import { describe, expect, it, vi } from 'vitest';
import { createAudioInputControlsController } from './audio-input-controls-controller';

type Listener = () => void | Promise<void>;

type MockControl = {
  listeners: Record<string, Listener>;
  value: string;
  dispatchEvent: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function createControl(value = ''): MockControl {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  };
}

function createDeps() {
  return {
    dom: {
      applySuggestedMicLatencyBtn: createControl(),
      startMicLatencyCalibrationBtn: createControl(),
      audioInputDevice: createControl(),
      micSensitivityPreset: createControl(),
      micNoteAttackFilter: createControl(),
      micNoteHoldFilter: createControl(),
      micPolyphonicDetectorProvider: createControl(),
      calibrateNoiseFloorBtn: createControl(),
      runMicPolyphonicBenchmarkBtn: createControl(),
      exportMicPolyphonicTelemetryBtn: createControl(),
      resetMicPolyphonicTelemetryBtn: createControl(),
      inputSource: createControl('midi'),
      midiInputDevice: createControl(),
      switchToMicrophoneFromMidiBtn: createControl(),
    },
    applySuggestedMicLatency: vi.fn(),
    startMicLatencyCalibration: vi.fn(),
    handleAudioInputDeviceChange: vi.fn(),
    handleSensitivityChange: vi.fn(),
    handleAttackChange: vi.fn(),
    handleHoldChange: vi.fn(),
    handlePolyphonicProviderChange: vi.fn(),
    calibrateNoiseFloor: vi.fn(async () => {}),
    runMicPolyphonicBenchmark: vi.fn(async () => {}),
    exportMicPolyphonicTelemetry: vi.fn(),
    resetMicPolyphonicTelemetry: vi.fn(),
    handleInputSourceChange: vi.fn(async () => {}),
    handleMidiInputDeviceChange: vi.fn(),
  };
}

describe('audio-input-controls-controller', () => {
  it('routes mic latency actions and mic setting changes', async () => {
    const deps = createDeps();
    const controller = createAudioInputControlsController(deps as never);

    controller.register();
    deps.dom.applySuggestedMicLatencyBtn.listeners.click();
    deps.dom.startMicLatencyCalibrationBtn.listeners.click();
    deps.dom.audioInputDevice.listeners.change();
    deps.dom.micSensitivityPreset.listeners.change();
    deps.dom.micNoteAttackFilter.listeners.change();
    deps.dom.micNoteHoldFilter.listeners.change();
    deps.dom.micPolyphonicDetectorProvider.listeners.change();
    await deps.dom.calibrateNoiseFloorBtn.listeners.click();

    expect(deps.applySuggestedMicLatency).toHaveBeenCalledTimes(1);
    expect(deps.startMicLatencyCalibration).toHaveBeenCalledTimes(1);
    expect(deps.handleAudioInputDeviceChange).toHaveBeenCalledTimes(1);
    expect(deps.handleSensitivityChange).toHaveBeenCalledTimes(1);
    expect(deps.handleAttackChange).toHaveBeenCalledTimes(1);
    expect(deps.handleHoldChange).toHaveBeenCalledTimes(1);
    expect(deps.handlePolyphonicProviderChange).toHaveBeenCalledTimes(1);
    expect(deps.calibrateNoiseFloor).toHaveBeenCalledTimes(1);
  });

  it('routes benchmark and telemetry actions', async () => {
    const deps = createDeps();
    const controller = createAudioInputControlsController(deps as never);

    controller.register();
    await deps.dom.runMicPolyphonicBenchmarkBtn.listeners.click();
    deps.dom.exportMicPolyphonicTelemetryBtn.listeners.click();
    deps.dom.resetMicPolyphonicTelemetryBtn.listeners.click();

    expect(deps.runMicPolyphonicBenchmark).toHaveBeenCalledTimes(1);
    expect(deps.exportMicPolyphonicTelemetry).toHaveBeenCalledTimes(1);
    expect(deps.resetMicPolyphonicTelemetry).toHaveBeenCalledTimes(1);
  });

  it('routes input source and midi device changes', async () => {
    const deps = createDeps();
    const controller = createAudioInputControlsController(deps as never);

    controller.register();
    await deps.dom.inputSource.listeners.change();
    deps.dom.midiInputDevice.listeners.change();

    expect(deps.handleInputSourceChange).toHaveBeenCalledTimes(1);
    expect(deps.handleMidiInputDeviceChange).toHaveBeenCalledTimes(1);
  });

  it('switches from midi to microphone and dispatches change', () => {
    const deps = createDeps();
    const controller = createAudioInputControlsController(deps as never);

    controller.register();
    deps.dom.switchToMicrophoneFromMidiBtn.listeners.click();
    deps.dom.inputSource.value = 'microphone';
    deps.dom.switchToMicrophoneFromMidiBtn.listeners.click();

    expect(deps.dom.inputSource.value).toBe('microphone');
    expect(deps.dom.inputSource.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});
