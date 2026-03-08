import { createSessionStats } from './session-stats';
import type { SessionStats } from './types';

export interface SessionRuntimeActivationInput {
  forCalibration: boolean;
  selectedInputSource: 'microphone' | 'midi';
  sessionInputSource: 'microphone' | 'midi';
  modeKey?: string;
  modeLabel?: string;
  instrumentName?: string;
  tuningPresetKey?: string;
  stringOrder?: string[];
  enabledStrings?: string[];
  minFret?: number;
  maxFret?: number;
  melodyId?: string | null;
  melodyStudyRangeStartIndex?: number | null;
  melodyStudyRangeEndIndex?: number | null;
  melodyTransposeSemitones?: number;
  melodyStringShift?: number;
  audioInputDeviceLabel?: string;
  midiInputDeviceLabel?: string;
}

export interface SessionRuntimeActivationDeps {
  setIsListening: (isListening: boolean) => void;
  setActiveSessionStats: (sessionStats: SessionStats | null) => void;
  resetPromptCycleTracking: () => void;
  setStatusText: (text: string) => void;
  nextPrompt: () => void;
  processAudio: () => void;
}

function resolveInputDeviceLabel(input: SessionRuntimeActivationInput) {
  const audioLabel = input.audioInputDeviceLabel?.trim() || 'Default microphone';
  const midiLabel = input.midiInputDeviceLabel?.trim() || 'Default MIDI device';
  return input.sessionInputSource === 'midi' ? midiLabel : audioLabel;
}

export function executeSessionRuntimeActivation(
  input: SessionRuntimeActivationInput,
  deps: SessionRuntimeActivationDeps
) {
  deps.setIsListening(true);

  if (!input.forCalibration) {
    deps.setActiveSessionStats(
      createSessionStats({
        modeKey: input.modeKey ?? '',
        modeLabel: input.modeLabel ?? input.modeKey ?? '',
        instrumentName: input.instrumentName ?? '',
        tuningPresetKey: input.tuningPresetKey ?? '',
        inputSource: input.sessionInputSource,
        inputDeviceLabel: resolveInputDeviceLabel(input),
        stringOrder: input.stringOrder ?? [],
        enabledStrings: input.enabledStrings ?? [],
        minFret: input.minFret ?? 0,
        maxFret: input.maxFret ?? 12,
        melodyId: input.melodyId ?? null,
        melodyStudyRangeStartIndex: input.melodyStudyRangeStartIndex ?? null,
        melodyStudyRangeEndIndex: input.melodyStudyRangeEndIndex ?? null,
        melodyTransposeSemitones: input.melodyTransposeSemitones ?? 0,
        melodyStringShift: input.melodyStringShift ?? 0,
      })
    );
  }

  deps.resetPromptCycleTracking();

  if (!input.forCalibration) {
    deps.setStatusText(input.selectedInputSource === 'midi' ? 'Listening (MIDI)...' : 'Listening...');
    deps.nextPrompt();
  }

  if (input.selectedInputSource !== 'midi' || input.forCalibration) {
    deps.processAudio();
  }
}
