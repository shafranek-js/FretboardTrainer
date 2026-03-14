import { createMicSettingsController } from '../mic-settings-controller';
import { createAudioInputControlsController } from '../audio-input-controls-controller';
import { createInputDeviceController } from '../input-device-controller';
import { createMicPolyphonicBenchmarkController } from '../mic-polyphonic-benchmark-controller';
import { createMicPolyphonicTelemetryController } from '../mic-polyphonic-telemetry-controller';

interface SessionInputControlsClusterDeps {
  micSettings: Parameters<typeof createMicSettingsController>[0];
  inputDevice: Parameters<typeof createInputDeviceController>[0];
  micPolyphonicBenchmark: Parameters<typeof createMicPolyphonicBenchmarkController>[0];
  micPolyphonicTelemetry: Parameters<typeof createMicPolyphonicTelemetryController>[0];
  audioInputControls: {
    dom: Parameters<typeof createAudioInputControlsController>[0]['dom'];
    applySuggestedMicLatency: () => void;
    startMicLatencyCalibration: () => void;
  };
}

export function createSessionInputControlsCluster(deps: SessionInputControlsClusterDeps) {
  const micSettingsController = createMicSettingsController(deps.micSettings);
  const inputDeviceController = createInputDeviceController(deps.inputDevice);
  const micPolyphonicBenchmarkController = createMicPolyphonicBenchmarkController(deps.micPolyphonicBenchmark);
  const micPolyphonicTelemetryController = createMicPolyphonicTelemetryController(deps.micPolyphonicTelemetry);

  const audioInputControlsController = createAudioInputControlsController({
    dom: deps.audioInputControls.dom,
    applySuggestedMicLatency: deps.audioInputControls.applySuggestedMicLatency,
    startMicLatencyCalibration: deps.audioInputControls.startMicLatencyCalibration,
    handleAudioInputDeviceChange: () => inputDeviceController.handleAudioInputDeviceChange(),
    handleSensitivityChange: () => micSettingsController.handleSensitivityChange(),
    handleAttackChange: () => micSettingsController.handleAttackChange(),
    handleHoldChange: () => micSettingsController.handleHoldChange(),
    handlePolyphonicProviderChange: () => micSettingsController.handlePolyphonicProviderChange(),
    calibrateNoiseFloor: () => micSettingsController.calibrateNoiseFloor(),
    runMicPolyphonicBenchmark: () => micPolyphonicBenchmarkController.runBenchmark(),
    exportMicPolyphonicTelemetry: () => micPolyphonicTelemetryController.exportTelemetry(),
    resetMicPolyphonicTelemetry: () => micPolyphonicTelemetryController.resetTelemetry(),
    handleInputSourceChange: () => inputDeviceController.handleInputSourceChange(),
    handleMidiInputDeviceChange: () => inputDeviceController.handleMidiInputDeviceChange(),
  });

  return {
    micSettingsController,
    inputDeviceController,
    micPolyphonicBenchmarkController,
    micPolyphonicTelemetryController,
    audioInputControlsController,
  };
}

