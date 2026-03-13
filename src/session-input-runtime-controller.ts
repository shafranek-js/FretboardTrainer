import type { MidiNoteEvent } from './midi-runtime';
import type { AppState } from './state';

type AppDom = typeof import('./dom').dom;

type InputSource = 'microphone' | 'midi';

type MidiSessionHandler = ReturnType<typeof import('./midi-session-message-handler').createMidiSessionMessageHandler>;

interface SessionInputRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode' | 'inputSource' | 'melodySelector'>;
  state: Pick<
    AppState,
    | 'inputSource'
    | 'preferredAudioInputDeviceId'
    | 'audioContext'
    | 'isListening'
    | 'cooldown'
    | 'isCalibrating'
    | 'performanceMicHoldCalibrationLevel'
    | 'performanceMicLastJudgedOnsetNote'
    | 'performanceMicLastJudgedOnsetAtMs'
    | 'performanceMicLastUncertainOnsetNote'
    | 'performanceMicLastUncertainOnsetAtMs'
    | 'micLastInputRms'
    | 'micLastMonophonicConfidence'
    | 'micLastMonophonicPitchSpreadCents'
    | 'micLastMonophonicDetectedAtMs'
    | 'currentMelodyId'
  >;
  normalizeInputSource: (value: unknown) => InputSource;
  setInputSourcePreference: (inputSource: InputSource) => void;
  resolveSessionMicHoldCalibrationLevel: (input: {
    trainingMode: string;
    inputSource: InputSource;
  }) => AppState['performanceMicHoldCalibrationLevel'];
  resetReadinessAndJudgmentTelemetry: () => void;
  resetOnsetGateStatus: () => void;
  resetOnsetRejectTelemetry: () => void;
  clearPerformanceTimelineFeedback: () => void;
  resetMicPolyphonicDetectorTelemetry: () => void;
  clearAudioInputGuidanceError: () => void;
  refreshMicPolyphonicDetectorAudioInfoUi: () => void;
  refreshMicPerformanceReadinessUi: () => void;
  createMidiSessionMessageHandler: (input: {
    canProcessEvent: () => boolean;
    getCurrentModeDetectionType: () => string | null;
    getTrainingModeValue: () => string;
    handleMelodyUpdate: (event: MidiNoteEvent) => void;
    handlePolyphonicUpdate: (event: MidiNoteEvent) => void;
    clearLiveDetectedHighlight: () => void;
    handleStableMonophonicDetectedNote: (detectedNote: string, detectedFrequency?: number | null) => void;
    onRuntimeError: (context: string, error: unknown) => void;
  }) => MidiSessionHandler;
  startMidiInput: (handler: MidiSessionHandler) => Promise<void>;
  ensureAudioRuntime: (
    state: SessionInputRuntimeControllerDeps['state'],
    options: { audioInputDeviceId: string | null; analyserProfile: 'default' | 'low-latency-performance' }
  ) => Promise<void>;
  refreshAudioInputDeviceOptions: () => Promise<void>;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getCurrentModeDetectionType: () => string | null;
  handleMelodyUpdate: (event: MidiNoteEvent) => void;
  handlePolyphonicUpdate: (event: MidiNoteEvent) => void;
  clearLiveDetectedHighlight: () => void;
  handleStableMonophonicDetectedNote: (detectedNote: string, detectedFrequency?: number | null) => void;
  onRuntimeError: (context: string, error: unknown) => void;
  warn?: (message: string, error: unknown) => void;
}

export function createSessionInputRuntimeController(deps: SessionInputRuntimeControllerDeps) {
  function getTrainingMode() {
    return deps.dom.trainingMode.value;
  }

  async function prepareSessionInput(forCalibration = false) {
    if (!forCalibration) {
      deps.setInputSourcePreference(deps.normalizeInputSource(deps.dom.inputSource.value));
    }

    const selectedInputSource: InputSource = !forCalibration ? deps.state.inputSource : 'microphone';

    deps.state.performanceMicHoldCalibrationLevel = forCalibration
      ? 'off'
      : deps.resolveSessionMicHoldCalibrationLevel({
          trainingMode: getTrainingMode(),
          inputSource: selectedInputSource,
        });

    if (!forCalibration) {
      deps.state.performanceMicLastJudgedOnsetNote = null;
      deps.state.performanceMicLastJudgedOnsetAtMs = null;
      deps.state.performanceMicLastUncertainOnsetNote = null;
      deps.state.performanceMicLastUncertainOnsetAtMs = null;
      deps.state.micLastInputRms = 0;
      deps.state.micLastMonophonicConfidence = null;
      deps.state.micLastMonophonicPitchSpreadCents = null;
      deps.state.micLastMonophonicDetectedAtMs = null;
      deps.resetReadinessAndJudgmentTelemetry();
      deps.resetOnsetGateStatus();
      deps.resetOnsetRejectTelemetry();
      deps.state.currentMelodyId = deps.dom.melodySelector.value.trim() || null;
      deps.clearPerformanceTimelineFeedback();
      deps.resetMicPolyphonicDetectorTelemetry();
      if (selectedInputSource === 'microphone') {
        deps.clearAudioInputGuidanceError();
        deps.refreshMicPolyphonicDetectorAudioInfoUi();
        deps.refreshMicPerformanceReadinessUi();
      }
    }

    if (!forCalibration && selectedInputSource === 'midi') {
      await deps.startMidiInput(
        deps.createMidiSessionMessageHandler({
          canProcessEvent: () => deps.state.isListening && !deps.state.cooldown && !deps.state.isCalibrating,
          getCurrentModeDetectionType: deps.getCurrentModeDetectionType,
          getTrainingModeValue: getTrainingMode,
          handleMelodyUpdate: deps.handleMelodyUpdate,
          handlePolyphonicUpdate: deps.handlePolyphonicUpdate,
          clearLiveDetectedHighlight: deps.clearLiveDetectedHighlight,
          handleStableMonophonicDetectedNote: deps.handleStableMonophonicDetectedNote,
          onRuntimeError: deps.onRuntimeError,
        })
      );
    } else {
      await deps.ensureAudioRuntime(deps.state, {
        audioInputDeviceId: deps.state.preferredAudioInputDeviceId,
        analyserProfile:
          !forCalibration &&
          selectedInputSource === 'microphone' &&
          deps.isPerformanceStyleMode(getTrainingMode())
            ? 'low-latency-performance'
            : 'default',
      });
      await deps.refreshAudioInputDeviceOptions();
    }

    if (deps.state.audioContext?.state === 'suspended') {
      try {
        await deps.state.audioContext.resume();
      } catch (error) {
        deps.warn?.('Failed to resume AudioContext during session start:', error);
      }
    }

    if (selectedInputSource !== 'midi' && deps.state.audioContext?.state === 'suspended') {
      throw new Error(
        'Audio context is suspended. Click anywhere in the page and press Start Session again.'
      );
    }

    return {
      selectedInputSource,
    };
  }

  return {
    prepareSessionInput,
  };
}
