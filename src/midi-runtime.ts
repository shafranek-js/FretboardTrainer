import { dom, state } from './state';
import { updateSessionInputStatusHud } from './input-source-status';
import { parseMidiMessageData } from './midi-message';

export type InputSourceKind = 'microphone' | 'midi';

export interface MidiNoteEvent {
  kind: 'noteon' | 'noteoff';
  noteNumber: number;
  noteName: string;
  velocity: number;
  timestampMs: number;
  heldNoteNames: string[];
}

type MidiNoteHandler = (event: MidiNoteEvent) => void;

const heldMidiNoteNumbers = new Set<number>();

function getRequestMIDIAccess():
  | ((options?: MIDIOptions) => Promise<MIDIAccess>)
  | null {
  const navigatorWithMidi = navigator as Navigator & {
    requestMIDIAccess?: (options?: MIDIOptions) => Promise<MIDIAccess>;
  };
  return navigatorWithMidi.requestMIDIAccess ?? null;
}

export function supportsWebMidi() {
  return Boolean(getRequestMIDIAccess());
}

export function refreshInputSourceAvailabilityUi() {
  const midiOption = [...dom.inputSource.options].find((option) => option.value === 'midi');
  if (!midiOption) return;

  const supported = supportsWebMidi();
  midiOption.disabled = !supported;
  midiOption.textContent = supported ? 'MIDI (Web MIDI)' : 'MIDI (Web MIDI - Unsupported)';

  if (!supported && state.inputSource === 'midi') {
    setInputSourcePreference('microphone');
  }
}

export function normalizeInputSource(value: unknown): InputSourceKind {
  return value === 'midi' ? 'midi' : 'microphone';
}

export function normalizeMidiInputDeviceId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function setInputSourcePreference(inputSource: InputSourceKind) {
  state.inputSource = inputSource === 'midi' && !supportsWebMidi() ? 'microphone' : inputSource;
  dom.inputSource.value = state.inputSource;
  const usingMidi = state.inputSource === 'midi';
  dom.midiInputRow.classList.toggle('hidden', !usingMidi);
  dom.midiInputInfo.classList.toggle('hidden', !usingMidi);
  updateSessionInputStatusHud();
}

export function setPreferredMidiInputDeviceId(deviceId: string | null) {
  state.preferredMidiInputDeviceId = deviceId;
  dom.midiInputDevice.value = deviceId ?? '';
  updateSessionInputStatusHud();
}

function populateMidiInputOptions(midiAccess: MIDIAccess | null) {
  const currentValue = state.preferredMidiInputDeviceId ?? '';
  dom.midiInputDevice.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Default MIDI device';
  dom.midiInputDevice.append(defaultOption);

  if (!midiAccess) {
    dom.midiInputDevice.disabled = true;
    dom.midiInputInfo.textContent = 'Web MIDI is not supported in this browser (Chrome/Edge desktop recommended).';
    return;
  }

  const inputs = Array.from(midiAccess.inputs.values());
  inputs.forEach((input, index) => {
    const option = document.createElement('option');
    option.value = input.id;
    option.textContent = input.name?.trim() || `MIDI Input ${index + 1}`;
    dom.midiInputDevice.append(option);
  });

  dom.midiInputDevice.disabled = inputs.length === 0;
  if (inputs.length === 0) {
    dom.midiInputInfo.textContent = 'No MIDI input devices detected. Connect a device and reopen Settings.';
    dom.midiInputDevice.value = '';
    state.preferredMidiInputDeviceId = null;
    return;
  }

  const hasCurrentValue = currentValue === '' || inputs.some((input) => input.id === currentValue);
  dom.midiInputDevice.value = hasCurrentValue ? currentValue : '';
  if (!hasCurrentValue) {
    state.preferredMidiInputDeviceId = null;
  }
  dom.midiInputInfo.textContent =
    'MIDI input supports single-note and chord/progression practice (Web MIDI / note-on + held notes).';
  updateSessionInputStatusHud();
}

export async function refreshMidiInputDevices(requestAccess = true) {
  if (!supportsWebMidi()) {
    state.midiAccess = null;
    populateMidiInputOptions(null);
    return;
  }

  try {
    if (!state.midiAccess && requestAccess) {
      const requestMIDIAccess = getRequestMIDIAccess();
      if (!requestMIDIAccess) {
        populateMidiInputOptions(null);
        return;
      }
      state.midiAccess = await requestMIDIAccess({ sysex: false });
      state.midiAccess.onstatechange = () => {
        populateMidiInputOptions(state.midiAccess);
      };
    }

    populateMidiInputOptions(state.midiAccess);
  } catch (error) {
    console.warn('Failed to initialize Web MIDI access:', error);
    state.midiAccess = null;
    populateMidiInputOptions(null);
  }
}

function detachMidiInputListener() {
  if (state.midiInput) {
    state.midiInput.onmidimessage = null;
    state.midiInput = null;
  }
}

function getSelectedMidiInput(midiAccess: MIDIAccess): MIDIInput | null {
  const inputs = Array.from(midiAccess.inputs.values());
  if (inputs.length === 0) return null;

  if (state.preferredMidiInputDeviceId) {
    const preferred = inputs.find((input) => input.id === state.preferredMidiInputDeviceId);
    if (preferred) return preferred;
  }

  return inputs[0] ?? null;
}

function parseMidiNoteEvent(event: MIDIMessageEvent): MidiNoteEvent | null {
  return parseMidiMessageData(
    event.data,
    typeof event.timeStamp === 'number' ? event.timeStamp : performance.now(),
    heldMidiNoteNumbers
  );
}

export async function startMidiInput(noteHandler: MidiNoteHandler) {
  await refreshMidiInputDevices(true);

  if (!state.midiAccess) {
    throw new Error('Web MIDI API is not available in this browser.');
  }

  const selectedInput = getSelectedMidiInput(state.midiAccess);
  if (!selectedInput) {
    throw new Error('No MIDI input device found.');
  }

  detachMidiInputListener();
  state.midiInput = selectedInput;
  state.midiInput.onmidimessage = (event) => {
    const parsed = parseMidiNoteEvent(event);
    if (!parsed) return;
    noteHandler(parsed);
  };

  // Keep UI selection aligned if we auto-selected the first device.
  setPreferredMidiInputDeviceId(selectedInput.id);
}

export function stopMidiInput() {
  heldMidiNoteNumbers.clear();
  detachMidiInputListener();
}
