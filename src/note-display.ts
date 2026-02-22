export type NoteNamingPreference = 'sharps' | 'flats';

const SHARP_TO_FLAT_MAP: Record<string, string> = {
  'A#': 'Bb',
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
};

const SHARP_NOTE_TOKEN_REGEX = /(A#|C#|D#|F#|G#)/g;

let noteNamingPreference: NoteNamingPreference = 'sharps';

export function normalizeNoteNamingPreference(value: string | null | undefined): NoteNamingPreference {
  return value === 'flats' ? 'flats' : 'sharps';
}

export function getNoteNamingPreference() {
  return noteNamingPreference;
}

export function setNoteNamingPreference(value: string | null | undefined) {
  noteNamingPreference = normalizeNoteNamingPreference(value);
}

export function formatDisplayNote(note: string) {
  if (noteNamingPreference !== 'flats') return note;
  return SHARP_TO_FLAT_MAP[note] ?? note;
}

export function formatMusicText(text: string) {
  if (!text || noteNamingPreference !== 'flats') return text;
  return text.replace(SHARP_NOTE_TOKEN_REGEX, (token) => SHARP_TO_FLAT_MAP[token] ?? token);
}
