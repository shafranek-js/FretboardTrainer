import type { MelodyDefinition } from './melody-library';
import type { IInstrument } from './instruments/instrument';
import { computeTimelineDurationLayout, getEventDurationBeats } from './melody-timeline-duration';

const DEFAULT_EXPORT_BPM = 90;
const EXPORT_PPQ = 480;

function sanitizeBpm(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_EXPORT_BPM;
  }
  return Math.max(30, Math.min(240, Math.round(value)));
}

function buildEventBeatDurations(melody: Pick<MelodyDefinition, 'events'>) {
  const layout = computeTimelineDurationLayout(melody);
  return melody.events.map((event, index) => {
    const fromBeats = getEventDurationBeats(event);
    if (fromBeats !== null) return Math.max(0.25, fromBeats);
    const weight = layout.weights[index] ?? 1;
    return Math.max(0.25, weight);
  });
}

function toTicks(beats: number) {
  return Math.max(1, Math.round(beats * EXPORT_PPQ));
}

function resolveNoteMidi(
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  note: MelodyDefinition['events'][number]['notes'][number]
) {
  if (note.stringName === null || typeof note.fret !== 'number' || !Number.isFinite(note.fret)) {
    return null;
  }

  const noteWithOctave = instrument.getNoteWithOctave(note.stringName, note.fret);
  if (!noteWithOctave) return null;

  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(noteWithOctave);
  if (!match) return null;
  const [, pitch, octaveText] = match;
  const pitchMap: Record<string, number> = {
    C: 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
  };
  const pitchClass = pitchMap[pitch];
  if (typeof pitchClass !== 'number') return null;
  const octave = Number.parseInt(octaveText, 10);
  if (!Number.isFinite(octave)) return null;
  return (octave + 1) * 12 + pitchClass;
}

export function buildExportMidiFileName(melodyName: string) {
  const safeStem = melodyName
    .trim()
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 0 && code <= 31) return ' ';
      return /[<>:"/\\|?*]/.test(char) ? ' ' : char;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96);
  return `${safeStem || 'melody'}.mid`;
}

export async function exportMelodyToMidiBytes(
  melody: Pick<MelodyDefinition, 'name' | 'events' | 'sourceTempoBpm' | 'sourceTrackName' | 'sourceScoreTitle'>,
  instrument: Pick<IInstrument, 'getNoteWithOctave'>,
  options?: { bpm?: number }
) {
  if (!Array.isArray(melody.events) || melody.events.length === 0) {
    throw new Error('Melody must contain at least one event to export MIDI.');
  }

  const { Midi } = await import('@tonejs/midi');
  const midi = new Midi();
  midi.header.name = melody.sourceScoreTitle?.trim() || melody.name.trim() || 'Fretboard Trainer Melody';
  midi.header.setTempo(sanitizeBpm(options?.bpm ?? melody.sourceTempoBpm));

  const track = midi.addTrack();
  track.name = melody.sourceTrackName?.trim() || melody.name.trim() || 'Melody';

  const eventBeatDurations = buildEventBeatDurations(melody);
  let currentTick = 0;
  let exportedNotes = 0;

  melody.events.forEach((event, index) => {
    const durationTicks = toTicks(eventBeatDurations[index] ?? 1);
    event.notes.forEach((note) => {
      const midiValue = resolveNoteMidi(instrument, note);
      if (midiValue === null) return;
      track.addNote({
        midi: midiValue,
        ticks: currentTick,
        durationTicks,
        velocity: 0.8,
      });
      exportedNotes += 1;
    });
    currentTick += durationTicks;
  });

  if (exportedNotes === 0) {
    throw new Error('Melody does not contain exportable positioned notes.');
  }

  return midi.toArray();
}
