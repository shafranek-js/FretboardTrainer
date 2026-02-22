export interface ParsedMidiMessageEvent {
  kind: 'noteon' | 'noteoff';
  noteNumber: number;
  noteName: string;
  velocity: number;
  timestampMs: number;
  heldNoteNames: string[];
}

const MIDI_PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function midiNoteNumberToPitchClass(noteNumber: number) {
  return MIDI_PITCH_CLASSES[((noteNumber % 12) + 12) % 12];
}

export function parseMidiMessageData(
  data: ArrayLike<number> | null | undefined,
  timestampMs: number,
  heldMidiNoteNumbers: Set<number>
): ParsedMidiMessageEvent | null {
  if (!data || data.length < 3) return null;

  const status = Number(data[0]) & 0xf0;
  const noteNumber = Number(data[1]);
  const velocity = Number(data[2]);
  let kind: 'noteon' | 'noteoff' | null = null;

  if (status === 0x90 && velocity > 0) {
    heldMidiNoteNumbers.add(noteNumber);
    kind = 'noteon';
  } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
    heldMidiNoteNumbers.delete(noteNumber);
    kind = 'noteoff';
  }

  if (!kind) return null;

  const heldNoteNames = [...new Set([...heldMidiNoteNumbers].map((num) => midiNoteNumberToPitchClass(num)))].sort();

  return {
    kind,
    noteNumber,
    noteName: midiNoteNumberToPitchClass(noteNumber),
    velocity,
    timestampMs,
    heldNoteNames,
  };
}
