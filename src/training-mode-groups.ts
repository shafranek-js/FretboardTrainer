export const CHORD_DATA_MODE_VALUES = ['chords', 'arpeggios', 'progressions'] as const;

const CHORD_DATA_MODES = new Set<string>(CHORD_DATA_MODE_VALUES);
const CHORD_AUDIO_REFERENCE_MODES = new Set<string>(['chords', 'progressions']);
const HINT_DISABLED_MODES = new Set<string>(['timed', 'free', 'rhythm', ...CHORD_DATA_MODE_VALUES]);

export function isChordDataMode(trainingMode: string) {
  return CHORD_DATA_MODES.has(trainingMode);
}

export function isChordAudioReferenceMode(trainingMode: string) {
  return CHORD_AUDIO_REFERENCE_MODES.has(trainingMode);
}

export function isArpeggioMode(trainingMode: string) {
  return trainingMode === 'arpeggios';
}

export function isProgressionMode(trainingMode: string) {
  return trainingMode === 'progressions';
}

export function isHintDisabledMode(trainingMode: string) {
  return HINT_DISABLED_MODES.has(trainingMode);
}
